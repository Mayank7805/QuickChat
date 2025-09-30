// models/Chat.js
const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  isGroupChat: {
    type: Boolean,
    default: false
  },
  groupName: {
    type: String,
    trim: true
  },
  groupAvatar: {
    type: String,
    default: ''
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better performance
ChatSchema.index({ participants: 1 });
ChatSchema.index({ lastActivity: -1 });

module.exports = mongoose.model('Chat', ChatSchema);