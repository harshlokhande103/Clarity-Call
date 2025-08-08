const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  loginUser,
  getUserProfile,
  addAvailability,
  getAvailability,
  deleteAvailability,
  updateProfile, // Add this line
  changePassword // Add this line
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// Register user
router.post('/register', registerUser);

// Login user
router.post('/login', loginUser);

// Get user profile
router.get('/profile', protect, getUserProfile);

// Availability routes
router.post('/availability', protect, addAvailability);
router.get('/availability', protect, getAvailability);
router.delete('/availability/:id', protect, deleteAvailability);

router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);

module.exports = router;