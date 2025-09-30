// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_in_production';

// Test route to verify auth routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes working!', timestamp: new Date() });
});

router.post('/register', async (req, res) => {
  console.log('\n🔥 === REGISTRATION ATTEMPT ===');
  console.log('📅 Timestamp:', new Date().toISOString());
  console.log('🌐 Request URL:', req.originalUrl);
  console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
  console.log('📋 Content-Type:', req.get('Content-Type'));
  
  try {
    // Extract data from request body
    const { username, displayName, email, password, passwordHash } = req.body;
    const userPassword = password || passwordHash;
    
    console.log('📝 Extracted fields:', {
      username: username || 'MISSING',
      displayName: displayName || 'MISSING',
      email: email || 'MISSING',
      password: userPassword ? '***PROVIDED***' : 'MISSING'
    });

    // Validate required fields
    if (!username) {
      console.log('❌ Missing username');
      return res.status(400).json({ error: 'Username is required' });
    }
    if (!displayName) {
      console.log('❌ Missing display name');
      return res.status(400).json({ error: 'Display name is required' });
    }
    if (!email) {
      console.log('❌ Missing email');
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!userPassword) {
      console.log('❌ Missing password');
      return res.status(400).json({ error: 'Password is required' });
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      console.log('❌ Invalid username format');
      return res.status(400).json({ error: 'Username can only contain lowercase letters, numbers, and underscores' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format');
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check password length
    if (userPassword.length < 6) {
      console.log('❌ Password too short');
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    console.log('🔍 Checking for existing user...');
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username: username.toLowerCase() }] 
    });
    
    if (existingUser) {
      console.log('❌ User already exists:', {
        byEmail: existingUser.email === email,
        byUsername: existingUser.username === username.toLowerCase()
      });
      return res.status(400).json({ 
        error: existingUser.email === email ? 'Email already registered' : 'Username already taken' 
      });
    }

    console.log('✅ No existing user found');
    console.log('🔒 Hashing password...');
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(userPassword, saltRounds);
    console.log('✅ Password hashed successfully');

    console.log('👤 Creating new user...');
    
    // Create new user
    const newUser = new User({
      username: username.toLowerCase().trim(),
      displayName: displayName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      friends: [],
      friendRequests: { sent: [], received: [] }
    });

    console.log('💾 Saving user to database...');
    const savedUser = await newUser.save();
    console.log('✅ User saved with ID:', savedUser._id);

    console.log('🎟️ Generating JWT token...');
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: savedUser._id, 
        username: savedUser.username,
        displayName: savedUser.displayName,
        email: savedUser.email
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    console.log('✅ Token generated successfully');

    const response = {
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: savedUser._id,
        username: savedUser.username,
        displayName: savedUser.displayName,
        email: savedUser.email,
        avatar: savedUser.avatar,
        status: savedUser.status,
        createdAt: savedUser.createdAt
      }
    };

    console.log('📤 Sending success response');
    console.log('🎉 === REGISTRATION SUCCESS ===\n');
    
    res.status(201).json(response);

  } catch (err) {
    console.log('\n💥 === REGISTRATION ERROR ===');
    console.log('❌ Error name:', err.name);
    console.log('❌ Error message:', err.message);
    console.log('❌ Error stack:', err.stack);
    
    // Handle specific MongoDB errors
    if (err.name === 'ValidationError') {
      console.log('❌ Validation error details:', err.errors);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: Object.keys(err.errors).map(key => err.errors[key].message)
      });
    }
    
    if (err.code === 11000) {
      console.log('❌ Duplicate key error:', err.keyPattern);
      const field = Object.keys(err.keyPattern)[0];
      const message = field === 'email' ? 'Email already registered' : 
                     field === 'username' ? 'Username already taken' : 'User already exists';
      return res.status(400).json({ 
        error: message,
        field: field
      });
    }

    console.log('💥 === REGISTRATION ERROR END ===\n');
    
    res.status(500).json({ 
      error: 'Registration failed',
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
});

router.post('/login', async (req, res) => {
  console.log('\n🔐 === LOGIN ATTEMPT ===');
  
  try {
    const { email, password } = req.body;
    console.log('📧 Login attempt for email:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.log('❌ User not found');
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('❌ Invalid password');
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful');
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;