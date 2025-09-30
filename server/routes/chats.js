const express = require('express');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Create or get existing chat between two users
router.post('/create', auth, async (req, res) => {
  try {
    const { friendId } = req.body;
    
    // Check if users are friends
    const currentUser = await User.findById(req.user.id);
    const isFriend = currentUser.friends.some(friend => friend.user.toString() === friendId);
    
    if (!isFriend) {
      return res.status(400).json({ message: 'You can only chat with friends' });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [req.user.id, friendId] },
      type: 'direct'
    }).populate('participants', 'username displayName avatar status');

    if (!chat) {
      // Create new chat
      chat = new Chat({
        participants: [req.user.id, friendId],
        type: 'direct'
      });
      await chat.save();
      await chat.populate('participants', 'username displayName avatar status');
    }

    res.json({ chat });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's chats
router.get('/list', auth, async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user.id
    })
    .populate('participants', 'username displayName avatar status')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

    // Format chats for frontend
    const formattedChats = chats.map(chat => {
      const otherParticipant = chat.participants.find(p => p._id.toString() !== req.user.id);
      
      return {
        _id: chat._id,
        name: chat.type === 'direct' ? otherParticipant.displayName : chat.name,
        avatar: chat.type === 'direct' ? otherParticipant.avatar : chat.avatar,
        type: chat.type,
        participants: chat.participants,
        lastMessage: chat.lastMessage,
        lastActivity: chat.updatedAt,
        unreadCount: 0, // TODO: Implement unread count
        isOnline: otherParticipant.status === 'online'
      };
    });

    res.json({ chats: formattedChats });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages for a specific chat
router.get('/:chatId/messages', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify user is participant in this chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({ messages: messages.reverse() }); // Reverse to show oldest first
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message
router.post('/:chatId/messages', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, type = 'text' } = req.body;

    // Verify user is participant in this chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Create message
    const message = new Message({
      chat: chatId,
      sender: req.user.id,
      content,
      type
    });

    await message.save();
    await message.populate('sender', 'username displayName avatar');

    // Update chat's last message
    chat.lastMessage = message._id;
    chat.updatedAt = new Date();
    await chat.save();

    // Emit real-time message to other participants
    const io = req.app.get('io');
    chat.participants.forEach(participantId => {
      if (participantId.toString() !== req.user.id) {
        io.to(`user_${participantId}`).emit('new_message', {
          chatId,
          message: {
            _id: message._id,
            content: message.content,
            type: message.type,
            sender: message.sender,
            createdAt: message.createdAt
          }
        });
      }
    });

    res.json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;