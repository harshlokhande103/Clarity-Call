const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { message: 'Too many requests, try later' }
});

// Register user
router.post('/register', userController.registerUser);

// OTP routes
router.post('/send-otp', userController.sendOTP);
router.post('/verify-otp', userController.verifyOTP);

// Login user
router.post('/login', userController.loginUser);

// Get user profile
router.get('/profile', protect, userController.getUserProfile);

// Availability routes
router.post('/availability', protect, userController.addAvailability);
router.get('/availability', protect, userController.getAvailability);
router.delete('/availability/:id', protect, userController.deleteAvailability);

// Profile and password routes
router.put('/profile', protect, userController.updateProfile);
router.put('/password', protect, userController.changePassword);

// Password reset routes
router.post('/forgot-password', forgotLimiter, userController.forgotPassword);
router.get('/verify-reset-token', userController.verifyResetToken);
router.post('/reset-password', userController.resetPassword);

module.exports = router;
