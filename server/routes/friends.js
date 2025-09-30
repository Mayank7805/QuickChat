const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Search users by username or display name
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user.id } }, // Exclude current user
        {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { displayName: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    })
    .select('username displayName avatar status')
    .limit(20);

    res.json({ users });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send friend request
router.post('/request', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentUser = await User.findById(req.user.id);
    
    // Check if already friends
    if (currentUser.friends.some(friend => friend.user.toString() === userId)) {
      return res.status(400).json({ message: 'Already friends with this user' });
    }

    // Check if request already sent
    if (currentUser.friendRequests.sent.some(req => req.user.toString() === userId)) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    // Check if request already received from this user
    if (currentUser.friendRequests.received.some(req => req.user.toString() === userId)) {
      return res.status(400).json({ message: 'This user has already sent you a friend request' });
    }

    // Add to sent requests for current user
    currentUser.friendRequests.sent.push({ user: userId });
    await currentUser.save();

    // Add to received requests for target user
    targetUser.friendRequests.received.push({ user: req.user.id });
    await targetUser.save();

    // Emit real-time event to target user
    const io = req.app.get('io');
    io.to(`user_${userId}`).emit('friend_request_received', {
      from: {
        id: req.user.id,
        username: currentUser.username,
        displayName: currentUser.displayName,
        avatar: currentUser.avatar
      }
    });

    res.json({ message: 'Friend request sent successfully' });
  } catch (error) {
    console.error('Friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept friend request
router.post('/accept', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    
    const currentUser = await User.findById(req.user.id);
    const requesterUser = await User.findById(userId);
    
    if (!requesterUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if request exists
    if (!currentUser.friendRequests.received.some(req => req.user.toString() === userId)) {
      return res.status(400).json({ message: 'No friend request from this user' });
    }

    // Remove from friend requests
    currentUser.friendRequests.received = currentUser.friendRequests.received.filter(
      req => req.user.toString() !== userId
    );
    requesterUser.friendRequests.sent = requesterUser.friendRequests.sent.filter(
      req => req.user.toString() !== req.user.id
    );

    // Add to friends
    currentUser.friends.push({ user: userId });
    requesterUser.friends.push({ user: req.user.id });

    await currentUser.save();
    await requesterUser.save();

    // Emit real-time events
    const io = req.app.get('io');
    
    // Notify the requester that their request was accepted
    io.to(`user_${userId}`).emit('friend_request_accepted', {
      from: {
        id: req.user.id,
        username: currentUser.username,
        displayName: currentUser.displayName,
        avatar: currentUser.avatar
      }
    });

    // Notify current user of new friend
    io.to(`user_${req.user.id}`).emit('new_friend', {
      friend: {
        id: userId,
        username: requesterUser.username,
        displayName: requesterUser.displayName,
        avatar: requesterUser.avatar,
        status: requesterUser.status
      }
    });

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Decline friend request
router.post('/decline', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    
    const currentUser = await User.findById(req.user.id);
    const requesterUser = await User.findById(userId);
    
    if (!requesterUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove from friend requests
    currentUser.friendRequests.received = currentUser.friendRequests.received.filter(
      req => req.user.toString() !== userId
    );
    requesterUser.friendRequests.sent = requesterUser.friendRequests.sent.filter(
      req => req.user.toString() !== req.user.id
    );

    await currentUser.save();
    await requesterUser.save();

    // Emit real-time event
    const io = req.app.get('io');
    io.to(`user_${userId}`).emit('friend_request_declined', {
      from: {
        id: req.user.id,
        username: currentUser.username,
        displayName: currentUser.displayName
      }
    });

    res.json({ message: 'Friend request declined' });
  } catch (error) {
    console.error('Decline friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get friends list
router.get('/list', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends.user', 'username displayName avatar status lastSeen')
      .populate('friendRequests.received.user', 'username displayName avatar')
      .populate('friendRequests.sent.user', 'username displayName avatar');

    const friendsList = user.friends.map(friend => ({
      _id: friend.user._id,
      username: friend.user.username,
      displayName: friend.user.displayName,
      avatar: friend.user.avatar,
      status: friend.user.status,
      lastSeen: friend.user.lastSeen,
      addedAt: friend.addedAt
    }));

    const pendingRequests = {
      received: user.friendRequests.received.map(req => ({
        _id: req.user._id,
        username: req.user.username,
        displayName: req.user.displayName,
        avatar: req.user.avatar,
        receivedAt: req.receivedAt
      })),
      sent: user.friendRequests.sent.map(req => ({
        _id: req.user._id,
        username: req.user.username,
        displayName: req.user.displayName,
        avatar: req.user.avatar,
        sentAt: req.sentAt
      }))
    };

    res.json({
      friends: friendsList,
      pendingRequests: pendingRequests
    });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove friend
router.delete('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const currentUser = await User.findById(req.user.id);
    const friendUser = await User.findById(userId);
    
    if (!friendUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove from friends list
    currentUser.friends = currentUser.friends.filter(friend => friend.user.toString() !== userId);
    friendUser.friends = friendUser.friends.filter(friend => friend.user.toString() !== req.user.id);

    await currentUser.save();
    await friendUser.save();

    // Emit real-time event
    const io = req.app.get('io');
    io.to(`user_${userId}`).emit('friend_removed', {
      from: {
        id: req.user.id,
        username: currentUser.username,
        displayName: currentUser.displayName
      }
    });

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;