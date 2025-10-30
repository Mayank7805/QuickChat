// index.js (or index.cjs)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const friendRoutes = require('./routes/friends');
const chatRoutes = require('./routes/chats');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175', 'http://127.0.0.1:5176'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175', 'http://127.0.0.1:5176'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/chats', chatRoutes);

// Make io available to routes
app.set('io', io);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date() });
});

// Socket.IO for real-time messaging
const onlineUsers = new Map(); // Track online users: userId -> Set of socket IDs
const userSockets = new Map(); // Track socket to user mapping: socketId -> userId

io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // User joins their personal room for friend requests and notifications
  socket.on('user_join', async (userId) => {
    socket.join(`user_${userId}`);
    socket.userId = userId;
    
    // Track this socket for the user
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);
    userSockets.set(socket.id, userId);
    
    console.log(`👤 User ${userId} joined personal room (${onlineUsers.get(userId).size} active connections)`);
    
    // Update user status to online in database (only if this is the first connection)
    try {
      const userSocketCount = onlineUsers.get(userId).size;
      if (userSocketCount === 1) {
        await mongoose.model('User').findByIdAndUpdate(userId, { 
          status: 'online',
          lastSeen: new Date()
        });
        
        // Notify friends about status change
        socket.broadcast.emit('user_status_change', {
          userId: userId,
          status: 'online'
        });
        console.log(`✅ User ${userId} status set to ONLINE`);
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  });

  // Join chat room
  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    console.log(`👤 User ${socket.id} joined chat ${chatId}`);
  });

  // Leave chat room
  socket.on('leave_chat', (chatId) => {
    socket.leave(chatId);
    console.log(`👤 User ${socket.id} left chat ${chatId}`);
  });

  // Handle new messages
  socket.on('send_message', async (data) => {
    console.log('📨 New message:', data);
    
    try {
      // Get sender information
      const sender = await mongoose.model('User').findById(data.message.sender).select('username displayName');
      
      // Emit to recipient with sender name
      socket.to(data.chatId).emit('new_message', {
        chatId: data.chatId,
        message: data.message,
        senderName: sender ? (sender.displayName || sender.username) : 'Unknown',
        senderId: data.message.sender
      });
    } catch (error) {
      console.error('Error sending message:', error);
      socket.to(data.chatId).emit('new_message', {
        chatId: data.chatId,
        message: data.message,
        senderName: 'Unknown',
        senderId: data.message.sender
      });
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    socket.to(data.chatId).emit('user_typing', {
      userId: data.userId,
      username: data.username,
      isTyping: true
    });
  });

  socket.on('typing_stop', (data) => {
    socket.to(data.chatId).emit('user_typing', {
      userId: data.userId,
      username: data.username,
      isTyping: false
    });
  });

  // Handle message reactions
  socket.on('message_reaction', (data) => {
    socket.to(data.chatId).emit('reaction_update', data);
  });

  // Handle user status updates
  socket.on('status_update', async (data) => {
    try {
      await mongoose.model('User').findByIdAndUpdate(data.userId, { 
        status: data.status,
        lastSeen: new Date()
      });
      
      socket.broadcast.emit('user_status_change', data);
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  });

  // WebRTC signaling for video/audio calls
  socket.on('webrtc_offer', (data) => {
    console.log('📞 WebRTC offer from', data.from, '(' + data.fromName + ') to', data.to);
    console.log('   Call type:', data.callType);
    console.log('   Online users:', Array.from(onlineUsers.keys()));
    const recipientSockets = onlineUsers.get(data.to);
    if (recipientSockets && recipientSockets.size > 0) {
      // Send to all of recipient's connected sockets
      const recipientSocketId = Array.from(recipientSockets)[0]; // Use first socket
      console.log('   ✅ Sending offer to recipient socket:', recipientSocketId);
      io.to(recipientSocketId).emit('webrtc_offer', data);
    } else {
      console.log('   ❌ Recipient not online or not found');
      // Notify caller that recipient is offline
      socket.emit('call_failed', { reason: 'User is offline' });
    }
  });

  socket.on('webrtc_answer', (data) => {
    console.log('📞 WebRTC answer from', data.from || socket.userId, 'to', data.to);
    const recipientSockets = onlineUsers.get(data.to);
    if (recipientSockets && recipientSockets.size > 0) {
      const recipientSocketId = Array.from(recipientSockets)[0];
      console.log('   ✅ Sending answer to caller socket:', recipientSocketId);
      io.to(recipientSocketId).emit('webrtc_answer', data);
    } else {
      console.log('   ❌ Caller not found');
    }
  });

  socket.on('webrtc_ice_candidate', (data) => {
    console.log('📞 ICE candidate from', socket.userId, 'to', data.to);
    const recipientSockets = onlineUsers.get(data.to);
    if (recipientSockets && recipientSockets.size > 0) {
      const recipientSocketId = Array.from(recipientSockets)[0];
      io.to(recipientSocketId).emit('webrtc_ice_candidate', data);
    }
  });

  socket.on('webrtc_call_ended', (data) => {
    console.log('📞 Call ended from', socket.userId, 'to', data.to);
    const recipientSockets = onlineUsers.get(data.to);
    if (recipientSockets && recipientSockets.size > 0) {
      // Notify all recipient's sockets
      recipientSockets.forEach(socketId => {
        io.to(socketId).emit('webrtc_call_ended', data);
      });
    }
  });

  socket.on('disconnect', async () => {
    console.log('👤 User disconnected:', socket.id);
    
    const userId = userSockets.get(socket.id);
    if (userId) {
      // Remove this socket from the user's socket set
      if (onlineUsers.has(userId)) {
        onlineUsers.get(userId).delete(socket.id);
        
        const remainingConnections = onlineUsers.get(userId).size;
        console.log(`👤 User ${userId} has ${remainingConnections} remaining connections`);
        
        // Only set to offline if no more connections
        if (remainingConnections === 0) {
          onlineUsers.delete(userId);
          
          // Update user status to offline
          try {
            await mongoose.model('User').findByIdAndUpdate(userId, { 
              status: 'offline',
              lastSeen: new Date()
            });
            
            // Notify friends about status change
            socket.broadcast.emit('user_status_change', {
              userId: userId,
              status: 'offline'
            });
            console.log(`❌ User ${userId} status set to OFFLINE`);
          } catch (error) {
            console.error('Error updating user status on disconnect:', error);
          }
        }
      }
      
      userSockets.delete(socket.id);
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Global error handler:', err);
  res.status(500).json({ 
    error: 'Something went wrong!',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/quickchat';

console.log('🚀 Starting server...');
console.log('📊 MongoDB URI:', MONGODB_URI);
console.log('🌐 Port:', PORT);

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    
    // Start server only after DB connection
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🎉 Server running on http://localhost:${PORT}`);
      console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
      console.log(`📝 Register endpoint: http://localhost:${PORT}/api/auth/register`);
      console.log(`🔗 Socket.IO enabled for real-time messaging`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('💡 Make sure MongoDB is running or check your connection string');
    process.exit(1);
  });

// Handle process termination
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully');
  mongoose.connection.close();
  process.exit(0);
});