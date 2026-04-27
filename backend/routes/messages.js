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
    // Denormalized so avatar shows correctly even if user later changes it
    senderAvatar: {
      type:    String,
      default: null,
    },
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
    imageUrl: {
      type:    String,
      default: null,
    },
    status: {
      type:    String,
      enum:    ['sent', 'delivered', 'read'],
      default: 'sent',
    },
  },
  { timestamps: true }
);

messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });
module.exports = mongoose.model('Message', messageSchema);