// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username must be less than 20 characters'],
    match: [/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores']
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true,
    minlength: [1, 'Display name is required'],
    maxlength: [50, 'Display name must be less than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  avatar: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    default: 'online',
    enum: ['online', 'offline', 'away', 'busy']
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  friends: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  friendRequests: {
    sent: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      sentAt: {
        type: Date,
        default: Date.now
      }
    }],
    received: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      receivedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  publicKey: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Add indexes for better performance
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ displayName: 1 });
UserSchema.index({ 'friends.user': 1 });

module.exports = mongoose.model('User', UserSchema);