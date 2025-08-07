const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to check if user is authenticated
const isAuthenticated = async (req, res, next) => {
  try {
    // Check for token in cookies
    const token = req.cookies.token;
    
    if (!token) {
      return res.redirect('/login');
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from token
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.redirect('/login');
    }
    
    // Set user in request
    req.user = user;
    res.locals.user = user;
    
    next();
  } catch (error) {
    console.error(error);
    res.redirect('/login');
  }
};

// Home page
router.get('/', (req, res) => {
  res.render('index', { title: 'Clarity Call - Connect with Mentors' });
});

// Register page
router.get('/register', (req, res) => {
  res.render('register', { title: 'Register' });
});

// Login page
router.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

// Dashboard page (protected)
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    res.render('dashboard', { 
      title: 'Dashboard',
      user: req.user
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'An error occurred while loading the dashboard');
    res.redirect('/');
  }
});

module.exports = router;