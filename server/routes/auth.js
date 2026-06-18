// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_in_production';

// Configure Nodemailer transporter (Gmail SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper: send verification email
const sendVerificationEmail = async (email, token) => {
  const serverUrl = process.env.SERVER_URL || 'http://localhost:5001';
  const verificationUrl = `${serverUrl}/api/auth/verify-email?token=${token}`;

  const mailOptions = {
    from: `"QuickChat" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify your QuickChat account',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #2563eb, #7c3aed); border-radius: 14px; line-height: 56px; font-size: 28px;">
            💬
          </div>
          <h1 style="margin: 16px 0 0; font-size: 24px; color: #1e293b;">Welcome to QuickChat!</h1>
        </div>
        <div style="background: white; border-radius: 12px; padding: 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
            Thanks for signing up! Please verify your email address by clicking the button below.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${verificationUrl}" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(99,102,241,0.4);">
              Verify Email Address
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 20px 0 0;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color: #6366f1; word-break: break-all;">${verificationUrl}</a>
          </p>
          <p style="color: #94a3b8; font-size: 13px; margin: 16px 0 0;">
            This link expires in 24 hours.
          </p>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
          If you didn't create a QuickChat account, you can safely ignore this email.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

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

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new user (unverified)
    const newUser = new User({
      username: username.toLowerCase().trim(),
      displayName: displayName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      friends: [],
      friendRequests: { sent: [], received: [] },
      isVerified: false,
      verificationToken,
      verificationTokenExpiry,
    });

    const savedUser = await newUser.save();
    console.log('✅ User saved with ID:', savedUser._id);

    // Send verification email
    try {
      await sendVerificationEmail(savedUser.email, verificationToken);
      console.log('📧 Verification email sent to:', savedUser.email);
    } catch (emailErr) {
      console.error('⚠️ Failed to send verification email:', emailErr.message);
      // Don't fail registration if email fails — user was still created
    }

    console.log('🎉 === REGISTRATION SUCCESS (pending verification) ===\n');

    res.status(201).json({
      success: true,
      message: 'Account created! Please check your email to verify your account before logging in.',
      needsVerification: true,
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

// ─── VERIFY EMAIL ────────────────────────────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(`
        <html><body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f1f5f9;">
          <div style="text-align:center;padding:40px;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <h1 style="color:#ef4444;">❌ Invalid Link</h1>
            <p style="color:#64748b;">No verification token provided.</p>
          </div>
        </body></html>
      `);
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).send(`
        <html><body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f1f5f9;">
          <div style="text-align:center;padding:40px;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <h1 style="color:#ef4444;">❌ Invalid or Expired</h1>
            <p style="color:#64748b;">This verification link is invalid or has expired.<br>Please register again.</p>
          </div>
        </body></html>
      `);
    }

    // Mark user as verified and clear the token
    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpiry = null;
    await user.save();

    console.log('✅ Email verified for user:', user.username);

    res.send(`
      <html><body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:linear-gradient(135deg,#f5f7fa 0%,#c3cfe2 100%);">
        <div style="text-align:center;padding:40px;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <div style="font-size:48px;margin-bottom:16px;">🎉</div>
          <h1 style="background:linear-gradient(135deg,#2563eb,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0 0 8px;">Email Verified!</h1>
          <p style="color:#64748b;margin:0 0 24px;">Your QuickChat account is now verified.</p>
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;text-decoration:none;border-radius:10px;font-weight:600;">
            Go to QuickChat →
          </a>
        </div>
      </body></html>
    `);

  } catch (err) {
    console.error('❌ Email verification error:', err);
    res.status(500).send(`
      <html><body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f1f5f9;">
        <div style="text-align:center;padding:40px;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <h1 style="color:#ef4444;">❌ Server Error</h1>
          <p style="color:#64748b;">Something went wrong. Please try again later.</p>
        </div>
      </body></html>
    `);
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

    // Block unverified users
    if (!user.isVerified) {
      console.log('⚠️ Unverified email for user:', user.username);
      return res.status(403).json({ error: 'Please verify your email first' });
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