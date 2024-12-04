const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const authenticateJWT = require('../middleware/auth');

router.get('/', (req, res) => {
  res.send('hello the world');
});

router.get('/auth', authenticateJWT, (req, res) => {
  const phone_number = req.user.phone_number;
  res.send(`hello the world after auth, your phone number is ${phone_number}`);
});

router.get('/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/users', async (req, res) => {
  const { phone_number } = req.body;

  if (!phone_number) {
    return res.status(400).json({ success: false, message: 'Missing phone number' });
  }

  try {
    const result = await pool.query('DELETE FROM users WHERE phone_number = $1 RETURNING *', [phone_number]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
