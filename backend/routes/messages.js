const express = require('express');
const Message = require('../models/Message');

const router = express.Router();

router.get('/:userId', async (req, res) => {
  // Set a hard 8-second timeout on the entire route
  const routeTimeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ message: 'Request timed out' });
    }
  }, 8000);

  try {
    const me    = req.user.id;
    const other = req.params.userId;

    const messages = await Message
      .find({
        $or: [
          { sender: me,    receiver: other },
          { sender: other, receiver: me    },
        ],
      })
      .sort({ createdAt: 1 })
      .limit(100)
      .maxTimeMS(6000)   // MongoDB query times out after 6s
      .lean();

    clearTimeout(routeTimeout);

    if (!res.headersSent) {
      res.json(messages);
    }

    // Mark as read AFTER responding — don't block the response
    Message.updateMany(
      { sender: other, receiver: me, status: { $ne: 'read' } },
      { $set: { status: 'read' } }
    ).catch(() => {});

  } catch (err) {
    clearTimeout(routeTimeout);
    console.error('GET /messages/:userId error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Could not fetch messages' });
    }
  }
});

module.exports = router;