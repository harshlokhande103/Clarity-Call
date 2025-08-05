const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Mentor, Client } = require('../models/User');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      req.flash('error_msg', 'User already exists');
      return res.redirect('/register');
    }

    // Create user with hashed password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      phone
    });

    // Create additional profile based on role
    if (role === 'mentor') {
      const { specialization, experience, bio, hourlyRate, availability } = req.body;
      
      await Mentor.create({
        user: user._id,
        specialization,
        experience,
        bio,
        hourlyRate,
        availability: availability || []
      });
    } else if (role === 'client') {
      const { issues } = req.body;
      
      await Client.create({
        user: user._id,
        issues: issues || []
      });
    }

    if (user) {
      // Create token
      const token = generateToken(user._id);
      
      // Set token in cookie
      res.cookie('token', token, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
      
      // Redirect to dashboard
      res.redirect('/dashboard');
    } else {
      req.flash('error_msg', 'Invalid user data');
      res.redirect('/register');
    }
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Server Error');
    res.redirect('/register');
  }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      req.flash('error_msg', 'Invalid email or password');
      return res.redirect('/login');
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      req.flash('error_msg', 'Invalid email or password');
      return res.redirect('/login');
    }
    
    // Create token
    const token = generateToken(user._id);
    
    // Set token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    // Redirect to dashboard
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Server Error');
    res.redirect('/login');
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      let profileData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      };

      // Get additional profile data based on role
      if (user.role === 'mentor') {
        const mentorProfile = await Mentor.findOne({ user: user._id });
        if (mentorProfile) {
          profileData = {
            ...profileData,
            specialization: mentorProfile.specialization,
            experience: mentorProfile.experience,
            bio: mentorProfile.bio,
            hourlyRate: mentorProfile.hourlyRate,
            availability: mentorProfile.availability,
            rating: mentorProfile.rating
          };
        }
      } else if (user.role === 'client') {
        const clientProfile = await Client.findOne({ user: user._id });
        if (clientProfile) {
          profileData = {
            ...profileData,
            issues: clientProfile.issues
          };
        }
      }

      res.json(profileData);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all mentors
// @route   GET /api/users/mentors
// @access  Public
const getMentors = async (req, res) => {
  try {
    // Find all users with role 'mentor'
    const mentorUsers = await User.find({ role: 'mentor' }).select('-password');
    
    // Get mentor profiles
    const mentors = await Mentor.find({
      user: { $in: mentorUsers.map(user => user._id) }
    }).populate('user', 'name email');
    
    res.json(mentors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Add this to the exports
module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  getMentors
};