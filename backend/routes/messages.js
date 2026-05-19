const express = require('express');
const prisma  = require('../lib/prisma');

const router = express.Router();

function serializeMessage(m) {
  return {
    _id:          m.id,
    sender:       m.senderId,
    receiver:     m.receiverId,
    senderName:   m.senderName,
    senderAvatar: m.senderAvatar,
    content:      m.content,
    messageType:  m.messageType.toLowerCase(),
    imageUrl:     m.imageUrl,
    status:       m.status.toLowerCase(),
    createdAt:    m.createdAt,
  };
}

router.get('/:userId', async (req, res) => {
  const routeTimeout = setTimeout(() => {
    if (!res.headersSent) res.status(504).json({ message: 'Request timed out' });
  }, 8000);

  try {
    const me    = req.user.id;
    const other = req.params.userId;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: me,    receiverId: other },
          { senderId: other, receiverId: me    },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    clearTimeout(routeTimeout);

    if (!res.headersSent) {
      res.json(messages.map(serializeMessage));
    }

    prisma.message.updateMany({
      where: { senderId: other, receiverId: me, status: { not: 'READ' } },
      data:  { status: 'READ' },
    }).catch(() => {});

  } catch (err) {
    clearTimeout(routeTimeout);
    console.error('GET /messages/:userId error:', err.message);
    if (!res.headersSent) res.status(500).json({ message: 'Could not fetch messages' });
  }
});

module.exports = router;
