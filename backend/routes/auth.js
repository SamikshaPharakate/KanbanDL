const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflowai_secret_key_13579';

// Helper to generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { user: { id: userId } },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Helper to compute daily streak
const updateStreak = (user) => {
  const now = new Date();
  const lastActive = new Date(user.lastActive || now);
  
  // Reset time part of dates
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastDate = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
  
  const diffTime = Math.abs(today - lastDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    // Active yesterday, increment streak
    user.streak += 1;
    
    // Streak badges
    if (user.streak >= 7 && !user.badges.includes('streak_7')) {
      user.badges.push('streak_7');
    }
    if (user.streak >= 30 && !user.badges.includes('streak_30')) {
      user.badges.push('streak_30');
    }
  } else if (diffDays > 1) {
    // Streak broken, reset to 1
    user.streak = 1;
  } else if (user.streak === 0) {
    // First activity
    user.streak = 1;
  }
  
  user.lastActive = now;
};

// @route    POST api/auth/register
// @desc     Register user
// @access   Public
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    if (!username || !username.trim() || !email || !email.trim() || !password) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    // Check if user exists
    let user = await User.findOne({ $or: [{ email: email.trim().toLowerCase() }, { username: username.trim() }] });
    if (user) {
      return res.status(400).json({ msg: 'User with this email or username already exists' });
    }

    user = new User({
      username: username.trim(),
      email: email.trim(),
      password,
      xp: 0,
      level: 1,
      streak: 1,
      badges: ['welcome'] // Starter badge!
    });

    await user.save();

    const token = generateToken(user.id);
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        badges: user.badges
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route    POST api/auth/login
// @desc     Authenticate user & get token
// @access   Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !email.trim() || !password) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    const emailStr = email.trim();
    // Find user by email or username
    let user = await User.findOne({
      $or: [
        { email: emailStr.toLowerCase() },
        { username: emailStr }
      ]
    });
    
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Update streak and activity
    updateStreak(user);
    await user.save();

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        badges: user.badges
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route    GET api/auth/user
// @desc     Get current user profile
// @access   Private
router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route    PUT api/auth/user
// @desc     Update current user profile (e.g. username)
// @access   Private
router.put('/user', auth, async (req, res) => {
  const { username } = req.body;
  
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (username) {
      // Check if username is already taken by someone else
      const existingUser = await User.findOne({ username });
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(400).json({ msg: 'Username is already taken' });
      }
      user.username = username;
    }

    await user.save();
    
    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
