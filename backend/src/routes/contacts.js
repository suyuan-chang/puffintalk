const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateJWT = require('../middleware/auth');
const { notifyClients } = require('../websocket');
const { sendSMS } = require('../utils/sms');

const getContacts = async (userId, phoneNumber) => {
  // Return updated contacts list.
  const updatedContacts = phoneNumber ?
    await pool.query(
      `SELECT c.contact_id, u.phone_number, c.display_name, c.status, c.last_touch_at, c.unread_messages
        FROM contacts c
        JOIN users u ON c.contact_id = u.id
        WHERE c.user_id = $1 AND u.phone_number = $2
        ORDER BY c.last_touch_at DESC`,
        [userId, phoneNumber]) :
    await pool.query(
        `SELECT c.contact_id, u.phone_number, c.display_name, c.status, c.last_touch_at, c.unread_messages
          FROM contacts c
          JOIN users u ON c.contact_id = u.id
          WHERE c.user_id = $1
          ORDER BY c.last_touch_at DESC`,
          [userId]);
  return updatedContacts.rows;
};

router.get('/', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const contacts = await getContacts(userId);
    res.status(200).json({ success: true, contacts: contacts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:phoneNumber', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const phoneNumber = req.params.phoneNumber;
    const contacts = await getContacts(userId, phoneNumber);
    res.status(200).json({ success: true, contacts: contacts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/request', authenticateJWT, async (req, res) => {
  const userId = req.user.user_id;
  const userPhoneNumber = req.user.phone_number;
  const { phone_number, display_name } = req.body;

  if (!phone_number) {
    return res.status(400).json({ success: false, message: 'Missing phone number' });
  }

  try {
    const userCheck = await pool.query('SELECT id FROM users WHERE phone_number = $1', [phone_number]);
    let contactId;
    if (userCheck.rows.length > 0) {
      contactId = userCheck.rows[0].id;
    } else {
      // Phone number not found, send SMS to invite the user to join PuffinTalk.
      console.log(`Sent inviting SMS to ${phone_number}`);
      try {
        const url = process.env.FRONTEND_DOMAIN || 'https://puffintalk.cloudmosa.com';
        const ret = await sendSMS(phone_number,
          `You are invited to join PuffinTalk by phone number +${userPhoneNumber}.
           Send and receive international message/voice/video free with your friends.
           Visit ${url}`);
        if (!ret.success) {
          return res.status(500).json({ success: false, message: 'Cannot send inviting SMS to phone number' });
        }
      } catch (err) {
        return res.status(500).json({ success: false, message: 'Cannot send inviting SMS to phone number' });
      }

      // Phone number not found, add a placeholder user into users table.
      const newUser = await pool.query(
        'INSERT INTO users (phone_number, status) VALUES ($1, $2) RETURNING id',
        [phone_number, 'inviting']
      );
      contactId = newUser.rows[0].id;
    }

    const contactCheck = await pool.query(
      'SELECT * FROM contacts WHERE user_id = $1 AND contact_id = $2',
      [userId, contactId]
    );
    const peerCheck = await pool.query(
      'SELECT * FROM contacts WHERE user_id = $1 AND contact_id = $2',
      [contactId, userId]
    );

    // Data consistency check. If contactCheck exists, peerCheck should also exist.
    if (contactCheck.rows.length !== peerCheck.rows.length) {
      console.error('Inconsistent contacts data');
      // Delete both contacts data.
      await pool.query('DELETE FROM contacts WHERE user_id = $1 AND contact_id = $2', [userId, contactId]);
      await pool.query('DELETE FROM contacts WHERE user_id = $1 AND contact_id = $2', [contactId, userId]);
    }

    if (contactCheck.rows.length > 0 && peerCheck.rows.length > 0) {
      // If contact exists, check current status.
      const contactStatus = contactCheck.rows[0].status;
      const peerStatus = peerCheck.rows[0].status;

      if (contactStatus === 'requested' ||
          ((contactStatus === 'deleted' || contactStatus === 'blocking') &&
            peerStatus === 'blocked')) {
        // If peer user has already sent a friend request, update both statuses to 'accepted'.
        // User can resume a deleted or blocked friendship if peer user didn't delete or block the user.
        await pool.query('BEGIN');
        await pool.query(
          'UPDATE contacts SET status = $1 WHERE user_id = $2 AND contact_id = $3',
          ['accepted', userId, contactId]
        );
        await pool.query(
          'UPDATE contacts SET status = $1 WHERE user_id = $2 AND contact_id = $3',
          ['accepted', contactId, userId]
        );
        await pool.query('COMMIT');
      } else if (contactStatus === 'requesting') {
        return res.status(409).json({ success: false, message: 'Friend request already sent' });
      } else if (contactStatus === 'accepted') {
        return res.status(409).json({ success: false, message: 'Already friend' });
      } else {
        return res.status(409).json({ success: false, message: 'Cannot become friend' });
      }
    } else {
      // If contact doesn't exist, create a new friend request.
      await pool.query('BEGIN');
      await pool.query(
        'INSERT INTO contacts (user_id, contact_id, status, created_at, last_touch_at) VALUES ($1, $2, $3, $4, $5)',
        [userId, contactId, 'requesting', new Date(), new Date()]
      );
      await pool.query(
        'INSERT INTO contacts (user_id, contact_id, status, created_at, last_touch_at) VALUES ($1, $2, $3, $4, $5)',
        [contactId, userId, 'requested', new Date(), new Date()]
      );
      await pool.query('COMMIT');
    }

    if (display_name || display_name === '') {
      await pool.query(
        'UPDATE contacts SET display_name = $1 WHERE user_id = $2 AND contact_id = $3',
        [display_name, userId, contactId]
      );
    }

    // Notify the receiver of contact list update.
    notifyClients({
      event: "contacts_updated",
      timestamp: new Date().toISOString()
    }, contactId);

    // Return updated contacts list.
    const updatedContacts = await getContacts(userId);
    res.status(200).json({ success: true, contacts: updatedContacts });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/accept', authenticateJWT, async (req, res) => {
  const userId = req.user.user_id;
  const { phone_number } = req.body;

  if (!phone_number) {
    return res.status(400).json({ success: false, message: 'Missing phone number' });
  }

  try {
    const userCheck = await pool.query('SELECT id FROM users WHERE phone_number = $1', [phone_number]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const contactId = userCheck.rows[0].id;

    const contactCheck = await pool.query(
      'SELECT * FROM contacts WHERE user_id = $1 AND contact_id = $2',
      [userId, contactId]
    );
    if (contactCheck.rows.length === 0 || contactCheck.rows[0].status !== 'requested') {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
    }

    await pool.query('BEGIN');
    await pool.query(
      'UPDATE contacts SET status = $1 WHERE user_id = $2 AND contact_id = $3',
      ['accepted', userId, contactId]
    );
    await pool.query(
      'UPDATE contacts SET status = $1 WHERE user_id = $2 AND contact_id = $3',
      ['accepted', contactId, userId]
    );
    await pool.query('COMMIT');

    // Notify the receiver of contact list update.
    notifyClients({
      event: "contacts_updated",
      timestamp: new Date().toISOString()
    }, contactId);

    // Return updated contacts list.
    const updatedContacts = await getContacts(userId);
    res.status(200).json({ success: true, contacts: updatedContacts });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/delete', authenticateJWT, async (req, res) => {
  const userId = req.user.user_id;
  const { phone_number, delete_from_contacts } = req.body;

  if (!phone_number) {
    return res.status(400).json({ success: false, message: 'Missing phone number' });
  }

  try {
    const userCheck = await pool.query('SELECT id FROM users WHERE phone_number = $1', [phone_number]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const contactId = userCheck.rows[0].id;

    const contactCheck = await pool.query(
      'SELECT * FROM contacts WHERE user_id = $1 AND contact_id = $2',
      [userId, contactId]
    );
    if (contactCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    const contactStatus = contactCheck.rows[0].status;
    if (contactStatus === 'requesting') {
      // cancel not respond friend request
      await pool.query('BEGIN');
      await pool.query('DELETE FROM contacts WHERE user_id = $1 AND contact_id = $2', [userId, contactId]);
      await pool.query('DELETE FROM contacts WHERE user_id = $1 AND contact_id = $2', [contactId, userId]);
      await pool.query('COMMIT');
    } else {
      // block this contact
      await pool.query('BEGIN');
      await pool.query(
        'UPDATE contacts SET status = $1 WHERE user_id = $2 AND contact_id = $3',
        ['deleted', userId, contactId]
      );
      await pool.query(
        'UPDATE contacts SET status = $1 WHERE user_id = $2 AND contact_id = $3',
        ['blocked', contactId, userId]
      );
      await pool.query('COMMIT');
    }

    // Notify the receiver of contact list update.
    notifyClients({
      event: "contacts_updated",
      timestamp: new Date().toISOString()
    }, contactId);

    // Return updated contacts list.
    const updatedContacts = await getContacts(userId);
    res.status(200).json({ success: true, contacts: updatedContacts });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/update', authenticateJWT, async (req, res) => {
  const userId = req.user.user_id;
  const { phone_number, display_name } = req.body;

  if (!phone_number || (!display_name && display_name !== '')) {
    return res.status(400).json({ success: false, message: 'Missing phone number or display name' });
  }

  try {
    const userCheck = await pool.query('SELECT id FROM users WHERE phone_number = $1', [phone_number]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const contactId = userCheck.rows[0].id;

    const contactCheck = await pool.query(
      'SELECT * FROM contacts WHERE user_id = $1 AND contact_id = $2',
      [userId, contactId]
    );
    if (contactCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    await pool.query(
      'UPDATE contacts SET display_name = $1 WHERE user_id = $2 AND contact_id = $3',
      [display_name, userId, contactId]
    );

    // Return updated contacts list.
    const updatedContacts = await getContacts(userId);
    res.status(200).json({ success: true, contacts: updatedContacts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
