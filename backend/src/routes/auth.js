const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const JWT_SECRET = process.env.JWT_SECRET || 'puffintalk_jwt_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

router.post('/signup', async (req, res) => {
  const { phone_number } = req.body;

  // Check if missing phone number
  if (!phone_number) {
    return res.status(400).json({ success: false, message: 'Missing phone number' });
  }
  // Check if phone number contain non-digit characters
  if (!/^\d+$/.test(phone_number)) {
    return res.status(400).json({ success: false, message: 'Invalid phone number' });
  }

  try {
    // Generate a 6-digit passcode
    const passcode = Math.floor(100000 + Math.random() * 900000).toString();
    const passcode_at = new Date();

    const userCheck = await pool.query('SELECT * FROM users WHERE phone_number = $1', [phone_number]);
    if (userCheck.rows.length > 0) {
      // If user is in inviting or registering status, update passcode and passcode_at.
      if (userCheck.rows[0].status === 'inviting' || userCheck.rows[0].status === 'registering') {
        await pool.query(
          'UPDATE users SET passcode = $1, passcode_at = $2 WHERE phone_number = $3',
          [passcode, passcode_at, phone_number]
        );
      } else {
        return res.status(409).json({ success: false, message: 'Phone number already registered' });
      }
    } else {
      await pool.query(
        'INSERT INTO users (phone_number, status, passcode, passcode_at) VALUES ($1, $2, $3, $4)',
        [phone_number, 'registering', passcode, passcode_at]
      );
    }

    // Here you would send the passcode via SMS to the user's phone number
    // For now, we'll just log it to the console
    console.log(`Passcode for ${phone_number}: ${passcode}`);

    res.status(200).json({ success: true, message: 'One-time passcode sent to the phone number' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/complete-signup', async (req, res) => {
  const { phone_number, passcode } = req.body;

  // Check if missing phone number or passcode
  if (!phone_number || !passcode) {
    return res.status(400).json({ success: false, message: 'Missing phone number or passcode' });
  }

  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE phone_number = $1', [phone_number]);
    if (userCheck.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid phone number' });
    }

    const user = userCheck.rows[0];
    if (user.status !== 'registering') {
      return res.status(400).json({ success: false, message: 'Invalid phone number' });
    }
    const wildcard_passcode = process.env.WILDCARD_PASSCODE;
    if (wildcard_passcode && passcode === wildcard_passcode) {
      console.warn('Wildcard passcode used to complete-signup');
    } else {
      if (user.passcode !== passcode) {
        return res.status(400).json({ success: false, message: 'Invalid passcode' });
      }
    }

    const passcodeExpiration = new Date(user.passcode_at);
    passcodeExpiration.setMinutes(passcodeExpiration.getMinutes() + 10); // Passcode valid for 10 minutes
    if (new Date() > passcodeExpiration) {
      return res.status(408).json({ success: false, message: 'Passcode is expired' });
    }

    await pool.query(
      'UPDATE users SET status = $1, passcode = NULL, passcode_at = NULL WHERE phone_number = $2',
      ['registered', phone_number]
    );

    const token = jwt.sign({ user_id: user.id, phone_number: user.phone_number }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(200).json({ success: true, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/signin', async (req, res) => {
  const { phone_number } = req.body;

  if (!phone_number) {
    return res.status(400).json({ success: false, message: 'Missing phone number' });
  }

  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE phone_number = $1', [phone_number]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid phone number' });
    }

    const user = userCheck.rows[0];
    if (user.status !== 'registered') {
      return res.status(400).json({ success: false, message: 'Invalid phone number' });
    }

    // Generate a 6-digit passcode
    const passcode = Math.floor(100000 + Math.random() * 900000).toString();
    const passcode_at = new Date();

    await pool.query(
      'UPDATE users SET passcode = $1, passcode_at = $2 WHERE phone_number = $3',
      [passcode, passcode_at, phone_number]
    );

    // Here you would send the passcode via SMS to the user's phone number
    // For now, we'll just log it to the console
    console.log(`Passcode for ${phone_number}: ${passcode}`);

    res.status(200).json({ success: true, message: 'One-time passcode sent to the phone number' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/complete-signin', async (req, res) => {
  const { phone_number, passcode } = req.body;

  if (!phone_number || !passcode) {
    return res.status(400).json({ success: false, message: 'Missing phone number or passcode' });
  }

  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE phone_number = $1', [phone_number]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid phone number' });
    }

    const user = userCheck.rows[0];
    if (user.status !== 'registered') {
      return res.status(400).json({ success: false, message: 'Invalid phone number or passcode' });
    }

    const wildcard_passcode = process.env.WILDCARD_PASSCODE;
    if (wildcard_passcode && passcode === wildcard_passcode) {
      console.warn('Wildcard passcode used to sign-in');
    } else {
      if (user.passcode !== passcode) {
        return res.status(400).json({ success: false, message: 'Invalid passcode' });
      }
    }

    const passcodeExpiration = new Date(user.passcode_at);
    passcodeExpiration.setMinutes(passcodeExpiration.getMinutes() + 10); // Passcode valid for 10 minutes
    if (new Date() > passcodeExpiration) {
      return res.status(408).json({ success: false, message: 'Passcode is expired' });
    }

    const token = jwt.sign({ user_id: user.id, phone_number: user.phone_number }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(200).json({ success: true, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
