const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateJWT = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { notifyClients } = require('../websocket');

router.get('/', authenticateJWT, async (req, res) => {
  const { phone_number } = req.body;
  const userId = req.user.user_id;

  try {
    if (phone_number) {
      const contactResult = await pool.query(
        'SELECT id FROM users WHERE phone_number = $1',
        [phone_number]
      );

      if (contactResult.rows.length === 0) {
        return res.status(404).json({ error: 'Recipient not found' });
      }
      const contactId = contactResult.rows[0].id;

      pool.query(
        `SELECT m.id, sender.phone_number AS sender, receiver.phone_number AS receiver,
            m.message, m.message_type, m.status, m.created_at,
            mc.media_type, mc.id AS media_content_id
         FROM messages m
         JOIN users sender ON m.sender_id = sender.id
         JOIN users receiver ON m.receiver_id = receiver.id
         LEFT JOIN media_content mc ON mc.message_id = m.id
         WHERE (m.sender_id = $1 AND m.receiver_id = $2) OR
               (m.sender_id = $2 AND m.receiver_id = $1)
         ORDER BY m.created_at DESC`,
        [userId, contactId],
        (error, results) => {
          if (error) {
        return res.status(500).json({ error: 'Database query error' });
          }
          res.status(200).json({ messages: results.rows });
        }
      );
    } else {
      pool.query(
        `SELECT m.id, sender.phone_number AS sender, receiver.phone_number AS receiver,
                m.message, m.message_type, m.status, m.created_at,
                mc.media_type, mc.id AS media_content_id
        FROM messages m
        JOIN users sender ON m.sender_id = sender.id
        JOIN users receiver ON m.receiver_id = receiver.id
        LEFT JOIN media_content mc ON mc.message_id = m.id
        WHERE m.sender_id = $1 OR m.receiver_id = $1
        ORDER BY m.created_at DESC`,
        [userId],
        (error, results) => {
          if (error) {
            return res.status(500).json({ error: 'Database query error' });
          }
          res.status(200).json({ messages: results.rows });
        }
      );
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
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
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const receiverId = receiverResult.rows[0].id;

    // check if the reciever is in sender's contacts and the contact status is 'accepted'.
    const contactResult = await pool.query(
      `SELECT status FROM contacts WHERE user_id = $1 AND contact_id = $2`,
      [senderId, receiverId]
    );
    if (contactResult.rows.length === 0 || contactResult.rows[0].status !== 'accepted') {
      return res.status(403).json({ error: 'You are not allowed to send messages to this user' });
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
        return res.status(404).json({ error: 'Media content not found' });
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
      return res.status(400).json({ error: 'Invalid message type' });
    }

    // Update last_touch_at field in contacts table for both sender and receiver.
    await pool.query(
      `UPDATE contacts
       SET last_touch_at = NOW()
       WHERE (user_id = $1 AND contact_id = $2) OR
             (user_id = $2 AND contact_id = $1)`,
      [senderId, receiverId]
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
              mc.media_type, mc.id AS media_content_id
       FROM messages m
       JOIN users sender ON m.sender_id = sender.id
       JOIN users receiver ON m.receiver_id = receiver.id
       LEFT JOIN media_content mc ON mc.message_id = m.id
       WHERE m.id = $1`,
      [messageId]);

    res.status(200).json({ messages: newMessage.rows });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/upload_media', authenticateJWT, upload.single('file'), async (req, res) => {
  const { media_type } = req.query;
  const creatorId = req.user.user_id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO media_content (creator_id, media_type, media_data, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [creatorId, media_type, file.buffer]
    );

    res.status(200).json({ id: result.rows[0].id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/media', authenticateJWT, async (req, res) => {
  const { media_content_id } = req.query;

  if (!media_content_id) {
    return res.status(400).json({ error: 'media_content_id is required' });
  }

  try {
    const mediaResult = await pool.query(
      'SELECT media_type, media_data FROM media_content WHERE id = $1',
      [media_content_id]
    );

    if (mediaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Media content not found' });
    }

    const media = mediaResult.rows[0];
    res.setHeader('Content-Type', media.media_type);
    res.send(media.media_data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
