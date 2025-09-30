// routes/users.js
const express = require('express');
const router = express.Router();
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

// Search users by username
router.get('/search/:query', authenticateToken, async (req, res) => {
  try {
    const { query } = req.params;
    const currentUserId = req.user.id;

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { username: { $regex: query.toLowerCase(), $options: 'i' } },
        { displayName: { $regex: query, $options: 'i' } }
      ]
    })
    .select('username displayName avatar status lastSeen')
    .limit(20);

    res.json({ users });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get user profile
router.get('/profile/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId)
      .select('username displayName avatar status lastSeen isVerified createdAt')
      .populate('friends.user', 'username displayName avatar');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Send friend request
router.post('/friend-request/:userId', authenticateToken, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId),
      User.findById(targetUserId)
    ]);

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already friends
    const isAlreadyFriend = currentUser.friends.some(
      friend => friend.user.toString() === targetUserId
    );

    if (isAlreadyFriend) {
      return res.status(400).json({ error: 'Already friends with this user' });
    }

    // Check if request already sent
    const requestAlreadySent = currentUser.friendRequests.sent.some(
      request => request.user.toString() === targetUserId
    );

    if (requestAlreadySent) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    // Check if there's a pending request from target user
    const pendingRequest = currentUser.friendRequests.received.some(
      request => request.user.toString() === targetUserId
    );

    if (pendingRequest) {
      // Auto-accept since both want to be friends
      await Promise.all([
        User.findByIdAndUpdate(currentUserId, {
          $push: { friends: { user: targetUserId } },
          $pull: { 'friendRequests.received': { user: targetUserId } }
        }),
        User.findByIdAndUpdate(targetUserId, {
          $push: { friends: { user: currentUserId } },
          $pull: { 'friendRequests.sent': { user: currentUserId } }
        })
      ]);

      return res.json({ message: 'Friend request accepted automatically', status: 'friends' });
    }

    // Send friend request
    await Promise.all([
      User.findByIdAndUpdate(currentUserId, {
        $push: { 'friendRequests.sent': { user: targetUserId } }
      }),
      User.findByIdAndUpdate(targetUserId, {
        $push: { 'friendRequests.received': { user: currentUserId } }
      })
    ]);

    res.json({ message: 'Friend request sent successfully', status: 'pending' });
  } catch (error) {
    console.error('Friend request error:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// Accept friend request
router.post('/accept-friend/:userId', authenticateToken, async (req, res) => {
  try {
    const requesterId = req.params.userId;
    const currentUserId = req.user.id;

    const currentUser = await User.findById(currentUserId);
    const hasRequest = currentUser.friendRequests.received.some(
      request => request.user.toString() === requesterId
    );

    if (!hasRequest) {
      return res.status(400).json({ error: 'No pending friend request from this user' });
    }

    // Add to friends and remove from requests
    await Promise.all([
      User.findByIdAndUpdate(currentUserId, {
        $push: { friends: { user: requesterId } },
        $pull: { 'friendRequests.received': { user: requesterId } }
      }),
      User.findByIdAndUpdate(requesterId, {
        $push: { friends: { user: currentUserId } },
        $pull: { 'friendRequests.sent': { user: currentUserId } }
      })
    ]);

    res.json({ message: 'Friend request accepted', status: 'friends' });
  } catch (error) {
    console.error('Accept friend error:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// Reject friend request
router.post('/reject-friend/:userId', authenticateToken, async (req, res) => {
  try {
    const requesterId = req.params.userId;
    const currentUserId = req.user.id;

    await Promise.all([
      User.findByIdAndUpdate(currentUserId, {
        $pull: { 'friendRequests.received': { user: requesterId } }
      }),
      User.findByIdAndUpdate(requesterId, {
        $pull: { 'friendRequests.sent': { user: currentUserId } }
      })
    ]);

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error('Reject friend error:', error);
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
});

// Get friend requests
router.get('/friend-requests', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    
    const user = await User.findById(currentUserId)
      .populate('friendRequests.received.user', 'username displayName avatar')
      .populate('friendRequests.sent.user', 'username displayName avatar');

    res.json({
      received: user.friendRequests.received,
      sent: user.friendRequests.sent
    });
  } catch (error) {
    console.error('Friend requests fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch friend requests' });
  }
});

// Get friends list
router.get('/friends', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    
    const user = await User.findById(currentUserId)
      .populate('friends.user', 'username displayName avatar status lastSeen');

    res.json({ friends: user.friends });
  } catch (error) {
    console.error('Friends fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// Remove friend
router.delete('/friend/:userId', authenticateToken, async (req, res) => {
  try {
    const friendId = req.params.userId;
    const currentUserId = req.user.id;

    await Promise.all([
      User.findByIdAndUpdate(currentUserId, {
        $pull: { friends: { user: friendId } }
      }),
      User.findByIdAndUpdate(friendId, {
        $pull: { friends: { user: currentUserId } }
      })
    ]);

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

module.exports = router;