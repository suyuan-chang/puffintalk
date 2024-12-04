const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const authenticateJWT = require('../middleware/auth');
const { notifyClients } = require('../websocket');

router.get('/', authenticateJWT, (req, res) => {
  const userId = req.user.user_id;

  pool.query(
    `SELECT c.contact_id, u.phone_number, c.display_name, c.status, c.last_touch_at
     FROM contacts c
     JOIN users u ON c.contact_id = u.id
     WHERE c.user_id = $1
     ORDER BY c.last_touch_at IS NULL DESC, c.last_touch_at DESC`,
    [userId],
    (error, results) => {
      if (error) {
        return res.status(500).json({ error: 'Database query error' });
      }
      res.status(200).json({ contacts: results.rows });
    }
  );
});

router.put('/request', authenticateJWT, async (req, res) => {
  const userId = req.user.user_id;
  const { phone_number } = req.body;

  if (!phone_number) {
    return res.status(400).json({ success: false, message: 'Missing phone number' });
  }

  try {
    const userCheck = await pool.query('SELECT id FROM users WHERE phone_number = $1', [phone_number]);
    let contactId;
    if (userCheck.rows.length > 0) {
      contactId = userCheck.rows[0].id;
    } else {
      // Phone number not found, add a placeholder user into users table.
      const newUser = await pool.query(
        'INSERT INTO users (phone_number, status) VALUES ($1, $2) RETURNING id',
        [phone_number, 'inviting']
      );
      contactId = newUser.rows[0].id;

      // TODO: Send SMS to phone_number with a link to the app.
      console.log(`Sent inviting SMS to ${phone_number}`);
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
        'INSERT INTO contacts (user_id, contact_id, status, created_at) VALUES ($1, $2, $3, $4)',
        [userId, contactId, 'requesting', new Date()]
      );
      await pool.query(
        'INSERT INTO contacts (user_id, contact_id, status, created_at) VALUES ($1, $2, $3, $4)',
        [contactId, userId, 'requested', new Date()]
      );
      await pool.query('COMMIT');
    }

    // Notify the receiver of contact list update.
    notifyClients({
      event: "contacts_updated",
      timestamp: new Date().toISOString()
    }, contactId);

    // Return updated contacts list.
    const updatedContacts = await pool.query(
      `SELECT c.contact_id, u.phone_number, c.display_name, c.status, c.last_touch_at
       FROM contacts c
       JOIN users u ON c.contact_id = u.id
       WHERE c.user_id = $1
       ORDER BY c.last_touch_at IS NULL DESC, c.last_touch_at DESC`,
       [userId]);

    res.status(200).json({ success: true, contacts: updatedContacts.rows });
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
    const updatedContacts = await pool.query(
      `SELECT c.contact_id, u.phone_number, c.display_name, c.status, c.last_touch_at
       FROM contacts c
       JOIN users u ON c.contact_id = u.id
       WHERE c.user_id = $1
       ORDER BY c.last_touch_at IS NULL DESC, c.last_touch_at DESC`,
       [userId]);

    res.status(200).json({ success: true, contacts: updatedContacts.rows });
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
    const updatedContacts = await pool.query(
      `SELECT c.contact_id, u.phone_number, c.display_name, c.status, c.last_touch_at
       FROM contacts c
       JOIN users u ON c.contact_id = u.id
       WHERE c.user_id = $1
       ORDER BY c.last_touch_at IS NULL DESC, c.last_touch_at DESC`,
       [userId]);

    res.status(200).json({ success: true, contacts: updatedContacts.rows });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/update', authenticateJWT, async (req, res) => {
  const userId = req.user.user_id;
  const { phone_number, display_name } = req.body;

  if (!phone_number || !display_name) {
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
    const updatedContacts = await pool.query(
      `SELECT c.contact_id, u.phone_number, c.display_name, c.status, c.last_touch_at
       FROM contacts c
       JOIN users u ON c.contact_id = u.id
       WHERE c.user_id = $1
       ORDER BY c.last_touch_at IS NULL DESC, c.last_touch_at DESC`,
       [userId]);

    res.status(200).json({ success: true, contacts: updatedContacts.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
