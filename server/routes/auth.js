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

// ─── REGISTER ────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  console.log('\n🔥 === REGISTRATION ATTEMPT ===');
  console.log('📅 Timestamp:', new Date().toISOString());
  console.log('📦 Request body:', JSON.stringify(req.body, null, 2));

  try {
    const { username, displayName, email, password, passwordHash } = req.body;
    const userPassword = password || passwordHash;

    // Validate required fields
    if (!username) return res.status(400).json({ error: 'Username is required' });
    if (!displayName) return res.status(400).json({ error: 'Display name is required' });
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!userPassword) return res.status(400).json({ error: 'Password is required' });

    // Validate username format
    if (!/^[a-z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain lowercase letters, numbers, and underscores' });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check password length
    if (userPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username: username.toLowerCase() }]
    });

    if (existingUser) {
      return res.status(400).json({
        error: existingUser.email === email ? 'Email already registered' : 'Username already taken'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userPassword, 12);

    // Create new user
    const newUser = new User({
      username: username.toLowerCase().trim(),
      displayName: displayName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      friends: [],
      friendRequests: { sent: [], received: [] },
    });

    const savedUser = await newUser.save();
    console.log('✅ User saved with ID:', savedUser._id);

    // Generate token so user is logged in immediately
    const token = jwt.sign(
      { id: savedUser._id, username: savedUser.username, email: savedUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('🎉 === REGISTRATION SUCCESS ===\n');

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email
      }
    });

  } catch (err) {
    console.log('\n💥 === REGISTRATION ERROR ===');
    console.error('❌ Error:', err.message);

    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: Object.keys(err.errors).map(key => err.errors[key].message)
      });
    }

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      const message = field === 'email' ? 'Email already registered' :
                     field === 'username' ? 'Username already taken' : 'User already exists';
      return res.status(400).json({ error: message, field });
    }

    res.status(500).json({
      error: 'Registration failed',
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
});

// ─── LOGIN ───────────────────────────────────────────────────────────────────
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