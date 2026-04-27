const express = require('express');
const User    = require('../models/User');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const users = await User
      .find({ _id: { $ne: req.user.id } })
      .select('name email _id avatar')   // include avatar
      .lean();
    res.json(users);
  } catch (err) {
    console.error('GET /users error:', err.message);
    res.status(500).json({ message: 'Could not fetch users' });
  }
});

module.exports = router;