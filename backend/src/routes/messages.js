const express = require('express');
const pool = require('../db');
const authenticateJWT = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { notifyClients } = require('../websocket');
const ffmpeg = require('fluent-ffmpeg');
const streamifier = require('streamifier');
const { JWT_SECRET } = require('../utils/jwt');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // Limit file size to 100 MB
});

router.get('/:phoneNumber', authenticateJWT, async (req, res) => {
  const phoneNumber = req.params.phoneNumber;
  const userId = req.user.user_id;
  const { count } = req.query;
  const limit = count ? parseInt(count, 10) : 100;

  try {
    if (phoneNumber) {
      const contactResult = await pool.query(
        'SELECT id FROM users WHERE phone_number = $1',
        [phoneNumber]
      );

      if (contactResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Recipient not found' });
      }
      const contactId = contactResult.rows[0].id;

      pool.query(
        `SELECT m.id, sender.phone_number AS sender, receiver.phone_number AS receiver,
                m.message, m.message_type, m.status, m.created_at,
                mc.media_type, mc.id AS media_content_id, mc.duration
         FROM messages m
         JOIN users sender ON m.sender_id = sender.id
         JOIN users receiver ON m.receiver_id = receiver.id
         LEFT JOIN media_content mc ON mc.message_id = m.id
         WHERE (m.sender_id = $1 AND m.receiver_id = $2) OR
               (m.sender_id = $2 AND m.receiver_id = $1)
         ORDER BY m.created_at DESC
         LIMIT $3`,
        [userId, contactId, limit],
        (error, results) => {
          if (error) {
            return res.status(500).json({ success: false, message: 'Database query error' });
          }
          res.status(200).json({ success: true, messages: results.rows });
        }
      );
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/send', authenticateJWT, async (req, res) => {
  const { phone_number, message_type, message, media_content_id } = req.body;
  const senderId = req.user.user_id;
  const senderPhoneNumber = req.user.phone_number;

  try {
    const receiverResult = await pool.query(
      'SELECT id FROM users WHERE phone_number = $1',
      [phone_number]
    );

    if (receiverResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    const receiverId = receiverResult.rows[0].id;

    // check if the reciever is in sender's contacts and the contact status is 'accepted'.
    const contactResult = await pool.query(
      `SELECT status FROM contacts WHERE user_id = $1 AND contact_id = $2`,
      [senderId, receiverId]
    );
    if (contactResult.rows.length === 0 || contactResult.rows[0].status !== 'accepted') {
      return res.status(403).json({ success: false, message: 'You are not allowed to send messages to this user' });
    }

    let messageId;
    if (message_type === 'text') {
      const messageResult = await pool.query(
        `INSERT INTO messages (sender_id, receiver_id, message, message_type, status, created_at)
         VALUES ($1, $2, $3, $4, 'created', NOW())
         RETURNING id`,
        [senderId, receiverId, message, message_type]
      );
      messageId = messageResult.rows[0].id;
    }
    else if (message_type === 'audio' || message_type == 'video') {
      const mediaResult = await pool.query(
        'SELECT media_type FROM media_content WHERE id = $1',
        [media_content_id]
      );
      if (mediaResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Media content not found' });
      }
      await pool.query('BEGIN');
      const messageResult = await pool.query(
        `INSERT INTO messages (sender_id, receiver_id, message, message_type, status, created_at)
         VALUES ($1, $2, $3, $4, 'created', NOW())
         RETURNING id`,
        [senderId, receiverId, message, message_type]
      );
      messageId = messageResult.rows[0].id;
      await pool.query(
        'UPDATE media_content SET message_id = $1 WHERE id = $2',
        [messageId, media_content_id]
      );
      await pool.query('COMMIT');
    }
    else {
      return res.status(400).json({ success: false, message: 'Invalid message type' });
    }

    // Update last_touch_at field in contacts table for both sender and receiver.
    await pool.query(
      `UPDATE contacts
       SET last_touch_at = NOW()
       WHERE (user_id = $1 AND contact_id = $2) OR
             (user_id = $2 AND contact_id = $1)`,
      [senderId, receiverId]
    );

    // Increase unread_messages by 1 in contacts table for the receiver.
    await pool.query(
      `UPDATE contacts SET unread_messages = unread_messages + 1
       WHERE user_id = $1 AND contact_id = $2`,
      [receiverId, senderId]
    );

    // Notify the receiver of the new message.
    if (notifyClients({
          event: "messages_updated",
          sender: senderPhoneNumber,
          timestamp: new Date().toISOString()
        }, receiverId)) {
      await pool.query(
        `UPDATE messages SET status = 'delivered' WHERE id = $1`,
        [messageId]
      );
    }

    // return the newly created message
    const newMessage = await pool.query(
      `SELECT m.id, sender.phone_number AS sender, receiver.phone_number AS receiver,
              m.message, m.message_type, m.status, m.created_at,
              mc.media_type, mc.id AS media_content_id, mc.duration
       FROM messages m
       JOIN users sender ON m.sender_id = sender.id
       JOIN users receiver ON m.receiver_id = receiver.id
       LEFT JOIN media_content mc ON mc.message_id = m.id
       WHERE m.id = $1`,
      [messageId]);

    res.status(200).json({ success: true, messages: newMessage.rows });
  } catch (error) {
    await pool.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/upload_media', authenticateJWT, upload.single('file'), async (req, res) => {
  const { media_type } = req.query;
  const creatorId = req.user.user_id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  if (!media_type.startsWith('audio/') && !media_type.startsWith('video/')) {
    return res.status(400).json({ success: false, message: 'Invalid media type' });
  }

  try {
    const stream = streamifier.createReadStream(file.buffer);

    ffmpeg.ffprobe(stream, (error, metadata) => {
      if (error) {
        return res.status(400).json({ success: false, message: 'Invalid media file', error, metadata });
      }
      let duration = metadata.format.duration; // duration is in seconds
      console.log(`Uploaded media format: ${media_type} duration: ${duration} seconds`, metadata);
      // NOTE: Some times ffprobe can not get the duration of the media file.
      if (typeof duration !== 'number') {
        duration = 10;
      }

      pool.query(
        `INSERT INTO media_content (creator_id, media_type, media_data, duration, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id`,
        [creatorId, media_type, file.buffer, duration]
      ).then(result => {
        res.status(200).json({ success: true, id: result.rows[0].id });
      }).catch(error => {
        res.status(500).json({ success: false, message: 'Server error', error });
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
});

router.get('/media/:id', async (req, res) => {
  const media_content_id = req.params.id;
  const { token } = req.query;

  if (!media_content_id) {
    return res.status(400).json({ success: false, message: 'media_content_id is required' });
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  let userId;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    userId = decoded.user_id;
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }

  try {
    const mediaResult = await pool.query(
      `SELECT creator_id, message_id, media_type, media_data
       FROM media_content WHERE id = $1`,
      [media_content_id]
    );

    if (mediaResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Media content not found' });
    }

    const creatorId = mediaResult.rows[0].creator_id;
    let senderId;
    let receiverId;
    if (mediaResult.rows[0].message_id) {
      const messageResult = await pool.query(
        'SELECT sender_id, receiver_id FROM messages WHERE id = $1',
        [mediaResult.rows[0].message_id]
      );
      senderId = messageResult.rows[0].sender_id;
      receiverId = messageResult.rows[0].receiver_id;
    }
    if (userId !== creatorId && userId !== senderId && userId !== receiverId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to access this media content' });
    }

    const media = mediaResult.rows[0];
    res.setHeader('Content-Type', media.media_type);
    res.send(media.media_data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/read', authenticateJWT, async (req, res) => {
  const { message_id } = req.body;
  const userId = req.user.user_id;

  try {
    const messageResult = await pool.query(
      'SELECT sender_id, receiver_id, status FROM messages WHERE id = $1',
      [message_id]
    );

    if (messageResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    const status = messageResult.rows[0].status;
    const senderId = messageResult.rows[0].sender_id;
    const receiverId = messageResult.rows[0].receiver_id;

    if (receiverId !== userId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to mark this message as seen' });
    }

    if (status !== 'seen') {
      await pool.query(
        'UPDATE messages SET status = $1 WHERE id = $2',
        ['seen', message_id]
      );

      // Synchornize contacts table, update unread_messages by couting the
      // number of messages with status is not 'seen'.
      await pool.query(
        `UPDATE contacts
         SET unread_messages = (SELECT COUNT(*) FROM messages
                                WHERE sender_id = contact_id AND receiver_id = user_id
                                AND status != 'seen')
         WHERE user_id = $1 AND contact_id = $2`,
        [userId, senderId]
      );

      console.log(`userId: ${userId}, senderId: ${senderId}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/read_all_text', authenticateJWT, async (req, res) => {
  const { phone_number } = req.body;
  const userId = req.user.user_id;

  try {
    const contactResult = await pool.query(
      'SELECT id FROM users WHERE phone_number = $1',
      [phone_number]
    );

    if (contactResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    const contactId = contactResult.rows[0].id;

    await pool.query(
      `UPDATE messages
       SET status = 'seen'
       WHERE sender_id = $1 AND receiver_id = $2 AND message_type = 'text' AND status != 'seen'`,
      [contactId, userId]
    );

    // Synchronize contacts table, update unread_messages by counting the
    // number of messages with status not 'seen'.
    await pool.query(
      `UPDATE contacts
       SET unread_messages = (SELECT COUNT(*) FROM messages
                              WHERE sender_id = contact_id AND receiver_id = user_id
                              AND status != 'seen')
       WHERE user_id = $1 AND contact_id = $2`,
      [userId, contactId]
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
