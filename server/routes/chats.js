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

    // Format response to match frontend expectations
    const otherParticipant = chat.participants.find(p => p._id.toString() !== req.user.id);
    
    const formattedChat = {
      _id: chat._id,
      participants: chat.participants,
      messages: [],
      friend: {
        _id: otherParticipant._id,
        username: otherParticipant.username,
        displayName: otherParticipant.displayName,
        status: otherParticipant.status || 'offline'
      }
    };

    res.json({ chat: formattedChat });
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

    // Remove duplicates: Keep only the most recent chat between same participants
    const seenPairs = new Map();
    const uniqueChats = [];
    
    for (const chat of chats) {
      const otherParticipant = chat.participants.find(p => p._id.toString() !== req.user.id);
      
      if (!otherParticipant) continue;
      
      const pairKey = [req.user.id, otherParticipant._id.toString()].sort().join('_');
      
      if (!seenPairs.has(pairKey)) {
        seenPairs.set(pairKey, true);
        uniqueChats.push(chat);
      } else {
        // Delete duplicate chat from database
        await Chat.findByIdAndDelete(chat._id);
        console.log(`Deleted duplicate chat: ${chat._id}`);
      }
    }

    // Format chats for frontend
    const formattedChats = uniqueChats.map(chat => {
      const otherParticipant = chat.participants.find(p => p._id.toString() !== req.user.id);
      
      return {
        _id: chat._id,
        participants: chat.participants,
        messages: [],
        friend: {
          _id: otherParticipant._id,
          username: otherParticipant.username,
          displayName: otherParticipant.displayName,
          status: otherParticipant.status || 'offline'
        },
        lastMessage: chat.lastMessage,
        lastActivity: chat.updatedAt,
        unreadCount: 0 // TODO: Implement unread count
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

    // Format messages for frontend
    const formattedMessages = messages.reverse().map(msg => ({
      _id: msg._id,
      sender: msg.sender._id,
      content: msg.content,
      timestamp: msg.createdAt,
      type: msg.type || 'text'
    }));

    res.json({ messages: formattedMessages });
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

    // Format message for response
    const formattedMessage = {
      _id: message._id,
      sender: message.sender._id,
      content: message.content,
      timestamp: message.createdAt,
      type: message.type || 'text'
    };

    // Emit real-time message to other participants
    const io = req.app.get('io');
    chat.participants.forEach(participantId => {
      if (participantId.toString() !== req.user.id) {
        io.to(`user_${participantId}`).emit('new_message', {
          chatId,
          message: formattedMessage,
          senderName: message.sender.displayName || message.sender.username,
          senderId: message.sender._id
        });
      }
    });

    res.json({ message: formattedMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;