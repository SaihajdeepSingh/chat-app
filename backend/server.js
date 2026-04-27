require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const jwt        = require('jsonwebtoken');

const connectDB      = require('./config/db');
const authRoutes     = require('./routes/auth');
const messageRoutes  = require('./routes/messages');
const userRoutes     = require('./routes/users');
const uploadRoutes   = require('./routes/upload');
const profileRoutes  = require('./routes/profile');
const { verifyToken} = require('./middleware/auth');
const User           = require('./models/User');
const Message        = require('./models/Message');

connectDB();

const app    = express();
const server = http.createServer(app);

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(s => s.trim())
  : ['http://localhost:5173'];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// ─── REST ─────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth',     authRoutes);
app.use('/api/messages', verifyToken, messageRoutes);
app.use('/api/users',    verifyToken, userRoutes);
app.use('/api/upload',   verifyToken, uploadRoutes);
app.use('/api/profile',  verifyToken, profileRoutes);

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
  pingTimeout: 60000, pingInterval: 25000,
});

const userSocketMap = new Map();   // userId → socketId

io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.id}`);

  socket.on('user-online', ({ userId }) => {
    userSocketMap.set(userId, socket.id);
    io.emit('online-users', [...userSocketMap.keys()]);
  });

  /* ── Send message (text or image) ── */
  socket.on('send-message', async ({ content, token, receiverId, messageType, imageUrl }) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const sender  = await User.findById(decoded.id).select('name avatar').lean();
      if (!sender) return;

      const receiverSocketId = userSocketMap.get(receiverId);
      const initialStatus    = receiverSocketId ? 'delivered' : 'sent';

      const message = await Message.create({
        sender:       decoded.id,
        receiver:     receiverId,
        senderName:   sender.name,
        senderAvatar: sender.avatar || null,
        content:      content     || '',
        messageType:  messageType || 'text',
        imageUrl:     imageUrl    || null,
        status:       initialStatus,
      });

      const msgObj = {
        _id:          message._id.toString(),
        sender:       message.sender.toString(),
        receiver:     message.receiver.toString(),
        senderName:   message.senderName,
        senderAvatar: message.senderAvatar,
        content:      message.content,
        messageType:  message.messageType,
        imageUrl:     message.imageUrl,
        status:       message.status,
        createdAt:    message.createdAt,
      };

      if (receiverSocketId) io.to(receiverSocketId).emit('new-message', msgObj);
      socket.emit('message-sent', msgObj);

    } catch (err) {
      console.error('send-message error:', err.message);
    }
  });

  /* ── Mark as read ── */
  socket.on('messages-read', async ({ senderId, token }) => {
    try {
      const decoded    = jwt.verify(token, process.env.JWT_SECRET);
      const receiverId = decoded.id.toString();

      const result = await Message.updateMany(
        { sender: senderId, receiver: receiverId, status: { $ne: 'read' } },
        { $set: { status: 'read' } }
      );

      if (result.modifiedCount > 0) {
        const senderSocketId = userSocketMap.get(senderId);
        if (senderSocketId) io.to(senderSocketId).emit('messages-read', { byUserId: receiverId });
      }
    } catch (err) {
      console.error('messages-read error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
    for (const [uid, sid] of userSocketMap.entries()) {
      if (sid === socket.id) { userSocketMap.delete(uid); break; }
    }
    io.emit('online-users', [...userSocketMap.keys()]);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));