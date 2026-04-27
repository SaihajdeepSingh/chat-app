const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    receiver: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    senderName: {
      type:     String,
      required: true,
    },
    // 'text' or 'image'
    messageType: {
      type:    String,
      enum:    ['text', 'image'],
      default: 'text',
    },
    content: {
      type:      String,
      default:   '',
      trim:      true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    // Cloudinary URL — only set for image messages
    imageUrl: {
      type:    String,
      default: null,
    },
    // ✓ sent | ✓✓ gray delivered | ✓✓ blue read
    status: {
      type:    String,
      enum:    ['sent', 'delivered', 'read'],
      default: 'sent',
    },
  },
  { timestamps: true }
);

messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);