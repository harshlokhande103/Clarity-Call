const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User, Mentor, Client } = require('../models/User');
const Appointment = require('../models/Appointment');
const Chat = require('../models/Chat');

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
    let userData = {
      user: req.user
    };
    
    // Get additional data based on user role
    if (req.user.role === 'client') {
      // Get mentors for client
      const mentors = await User.find({ role: 'mentor' })
        .select('-password');
      
      // Get mentor profiles
      const mentorProfiles = await Mentor.find({
        user: { $in: mentors.map(mentor => mentor._id) }
      }).populate('user', 'name email');
      
      userData.mentors = mentorProfiles;
    } else if (req.user.role === 'mentor') {
      // Get mentor profile
      const mentorProfile = await Mentor.findOne({ user: req.user._id });
      userData.mentorProfile = mentorProfile;
    }
    
    // Get appointments
    const appointments = await Appointment.find(
      req.user.role === 'client' 
        ? { client: req.user._id } 
        : { mentor: req.user._id }
    )
    .populate(req.user.role === 'client' ? 'mentor' : 'client', 'name email')
    .sort({ date: 1 });
    
    userData.appointments = appointments;
    
    // Get chats
    const chats = await Chat.find(
      req.user.role === 'client'
        ? { client: req.user._id, isActive: true }
        : { mentor: req.user._id, isActive: true }
    )
    .populate(req.user.role === 'client' ? 'mentor' : 'client', 'name email')
    .sort({ updatedAt: -1 });
    
    userData.chats = chats;
    
    res.render('dashboard', { 
      title: 'Dashboard',
      ...userData
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'An error occurred while loading the dashboard');
    res.redirect('/');
  }
});

// Profile page (protected)
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    let profileData = {
      user: req.user
    };
    
    // Get additional profile data based on role
    if (req.user.role === 'mentor') {
      const mentorProfile = await Mentor.findOne({ user: req.user._id });
      profileData.mentorProfile = mentorProfile;
    } else if (req.user.role === 'client') {
      const clientProfile = await Client.findOne({ user: req.user._id });
      profileData.clientProfile = clientProfile;
    }
    
    res.render('profile', {
      title: 'My Profile',
      ...profileData
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'An error occurred while loading your profile');
    res.redirect('/dashboard');
  }
});

// Appointments page (protected)
router.get('/appointments', isAuthenticated, async (req, res) => {
  try {
    const appointments = await Appointment.find(
      req.user.role === 'client' 
        ? { client: req.user._id } 
        : { mentor: req.user._id }
    )
    .populate(req.user.role === 'client' ? 'mentor' : 'client', 'name email')
    .sort({ date: 1 });
    
    res.render('appointments', {
      title: 'My Appointments',
      user: req.user,
      appointments
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'An error occurred while loading your appointments');
    res.redirect('/dashboard');
  }
});

// Book appointment page (protected, client only)
router.get('/book-appointment/:mentorId', isAuthenticated, async (req, res) => {
  try {
    // Check if user is a client
    if (req.user.role !== 'client') {
      req.flash('error_msg', 'Only clients can book appointments');
      return res.redirect('/dashboard');
    }
    
    // Get mentor
    const mentor = await User.findOne({ 
      _id: req.params.mentorId,
      role: 'mentor'
    }).select('-password');
    
    if (!mentor) {
      req.flash('error_msg', 'Mentor not found');
      return res.redirect('/dashboard');
    }
    
    // Get mentor profile
    const mentorProfile = await Mentor.findOne({ user: mentor._id });
    
    if (!mentorProfile) {
      req.flash('error_msg', 'Mentor profile not found');
      return res.redirect('/dashboard');
    }
    
    res.render('book-appointment', {
      title: `Book Appointment with ${mentor.name}`,
      user: req.user,
      mentor,
      mentorProfile
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'An error occurred while loading the booking page');
    res.redirect('/dashboard');
  }
});

// Chat page (protected)
router.get('/chat/:id', isAuthenticated, async (req, res) => {
  try {
    // Check if id is for a chat or an appointment
    let chat;
    
    // Try to find chat by id
    chat = await Chat.findById(req.params.id)
      .populate(req.user.role === 'client' ? 'mentor' : 'client', 'name email')
      .populate('messages.sender', 'name role');
    
    // If not found, check if it's an appointment id
    if (!chat) {
      const appointment = await Appointment.findById(req.params.id);
      
      if (!appointment) {
        req.flash('error_msg', 'Chat not found');
        return res.redirect('/dashboard');
      }
      
      // Check if user is part of this appointment
      if (
        appointment.client.toString() !== req.user._id.toString() &&
        appointment.mentor.toString() !== req.user._id.toString()
      ) {
        req.flash('error_msg', 'Not authorized');
        return res.redirect('/dashboard');
      }
      
      // Find or create chat for this appointment
      const chatQuery = {
        client: appointment.client,
        mentor: appointment.mentor,
        isActive: true
      };
      
      chat = await Chat.findOne(chatQuery);
      
      if (!chat) {
        chat = await Chat.create({
          ...chatQuery,
          appointment: appointment._id,
          messages: []
        });
        
        // Populate chat
        chat = await Chat.findById(chat._id)
          .populate(req.user.role === 'client' ? 'mentor' : 'client', 'name email')
          .populate('messages.sender', 'name role');
      }
    }
    
    // Check if user is part of this chat
    if (
      chat.client.toString() !== req.user._id.toString() &&
      chat.mentor.toString() !== req.user._id.toString()
    ) {
      req.flash('error_msg', 'Not authorized');
      return res.redirect('/dashboard');
    }
    
    // Get other user
    const otherUser = req.user.role === 'client' ? chat.mentor : chat.client;
    
    res.render('chat', {
      title: `Chat with ${otherUser.name}`,
      user: req.user,
      chat,
      otherUser
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'An error occurred while loading the chat');
    res.redirect('/dashboard');
  }
});

// Logout
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  req.flash('success_msg', 'You are logged out');
  res.redirect('/login');
});

module.exports = router;