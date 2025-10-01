// routes/messages.js
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_in_production';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Get or create chat between two users
router.post('/chat/:userId', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    if (currentUserId === otherUserId) {
      return res.status(400).json({ error: 'Cannot create chat with yourself' });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [currentUserId, otherUserId] },
      isGroupChat: false
    }).populate('participants', 'username displayName avatar status')
      .populate('lastMessage');

    if (!chat) {
      // Check if users are friends
      const currentUser = await User.findById(currentUserId);
      const isFriend = currentUser.friends.some(
        friend => friend.user.toString() === otherUserId
      );

      if (!isFriend) {
        return res.status(403).json({ error: 'Can only chat with friends' });
      }

      // Create new chat
      chat = new Chat({
        participants: [currentUserId, otherUserId],
        isGroupChat: false
      });
      
      await chat.save();
      await chat.populate('participants', 'username displayName avatar status');
    }

    res.json({ chat });
  } catch (error) {
    console.error('Chat creation error:', error);
    res.status(500).json({ error: 'Failed to create/get chat' });
  }
});

// Get all chats for current user
router.get('/chats', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const chats = await Chat.find({
      participants: currentUserId
    })
    .populate('participants', 'username displayName avatar status lastSeen')
    .populate('lastMessage')
    .sort({ lastActivity: -1 });

    res.json({ chats });
  } catch (error) {
    console.error('Chats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// Get messages for a chat
router.get('/chat/:chatId/messages', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify user is participant in chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(currentUserId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'username displayName avatar')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Messages fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message
router.post('/chat/:chatId/message', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { chatId } = req.params;
    const { content, messageType = 'text', type = 'text', replyTo, encryptedContent } = req.body;

    if (!content && !encryptedContent) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Verify user is participant in chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(currentUserId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const message = new Message({
      chat: chatId,
      sender: currentUserId,
      content: content || '',
      messageType,
      type,
      encryptedContent,
      isEncrypted: !!encryptedContent,
      replyTo: replyTo || null
    });

    await message.save();
    
    // Update chat's last activity and message
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message._id,
      lastActivity: new Date()
    });

    await message.populate('sender', 'username displayName avatar');
    if (replyTo) {
      await message.populate('replyTo');
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read
router.post('/chat/:chatId/read', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { chatId } = req.params;

    // Verify user is participant in chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(currentUserId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mark all messages as read for this user
    await Message.updateMany(
      { 
        chat: chatId,
        'readBy.user': { $ne: currentUserId }
      },
      { 
        $push: { 
          readBy: { 
            user: currentUserId,
            readAt: new Date()
          }
        }
      }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

module.exports = router;
