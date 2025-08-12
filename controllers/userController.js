const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { transporter, sendEmail } = require('../config/email'); // Changed this line

// Helper function to validate time format
const isValidTime = (time) => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const user = await User.create({ name, email, password });
    
    // Auto-login after registration
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000
    });
    
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Register error:', error);
    res.redirect('/register?error=Registration failed');
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    // Set cookie and redirect
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const user = await User.findOne({ email });
    const genericMsg = { message: 'If an account exists, a reset link has been sent to that email.' };

    if (!user) return res.status(200).json(genericMsg);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = Date.now() + 15 * 60 * 1000;

    await PasswordReset.create({ userId: user._id, tokenHash, expiresAt });

    const resetLink = `${process.env.FRONTEND_URL}/verify-reset-token?token=${rawToken}`;
    await sendEmail( // Changed this line to use sendEmail function
      user.email,
      'Password Reset Link',
      `<p>Click <a href="${resetLink}">here</a> to reset password. Valid for 15 minutes.</p>`
    );

    res.status(200).json(genericMsg);
  } catch (error) {
    console.error('ForgotPassword Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const verifyResetToken = async (req, res) => {
  try {
    const rawToken = req.query.token;
    if (!rawToken) return res.status(400).send('Token required');

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const record = await PasswordReset.findOne({
      tokenHash,
      used: false,
      expiresAt: { $gt: Date.now() }
    });

    if (!record) return res.status(400).send('Invalid or expired token');

    const resetJwt = jwt.sign({ prId: record._id }, process.env.RESET_JWT_SECRET, { expiresIn: '10m' });
    return res.redirect(`${process.env.FRONTEND_URL}/reset-password?resetToken=${resetJwt}`);
  } catch (error) {
    console.error('verifyResetToken error:', error);
    res.status(500).send('Server error');
  }
};

const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) return res.status(400).json({ message: 'Invalid request' });

    const payload = jwt.verify(resetToken, process.env.RESET_JWT_SECRET);
    const record = await PasswordReset.findById(payload.prId);
    if (!record || record.used || record.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const user = await User.findById(record.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = newPassword;
    await user.save();

    record.used = true;
    await record.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('resetPassword error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Send OTP via email
    await transporter.sendMail({
      from: `"Clarity Call" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Your OTP for Clarity Call',
      html: `<p>Your One-Time Password (OTP) is: <strong>${otp}</strong></p><p>This OTP is valid for 10 minutes.</p>`,
    });

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });
    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid OTP or expired' });
    }

    // Clear OTP after successful verification
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'OTP verified successfully', email: user.email });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const addAvailability = async (req, res) => {
  try {
    // Placeholder for adding availability logic
    res.status(200).json({ message: 'Add availability function not yet implemented.' });
  } catch (error) {
    console.error('Add availability error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAvailability = async (req, res) => {
  try {
    // Placeholder for getting availability logic
    res.status(200).json({ message: 'Get availability function not yet implemented.' });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteAvailability = async (req, res) => {
  try {
    // Placeholder for deleting availability logic
    res.status(200).json({ message: 'Delete availability function not yet implemented.' });
  } catch (error) {
    console.error('Delete availability error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// सबसे ऊपर जोड़ें
const asyncHandler = fn => (req, res, next) => 
    Promise.resolve(fn(req, res, next)).catch(next);

const updateProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    // Update name and email if provided
    if (req.body.name) {
        user.name = req.body.name;
    }
    if (req.body.email) {
        // Check if new email already exists for another user
        if (req.body.email !== user.email) {
            const existingEmail = await User.findOne({ email: req.body.email });
            if (existingEmail && existingEmail._id.toString() !== user._id.toString()) {
                res.status(400);
                throw new Error('Email already in use');
            }
        }
        user.email = req.body.email;
    }

    await user.save();

    return res.status(200).json({
        message: 'Profile updated successfully',
        user: {
            name: user.name,
            email: user.email
        }
    });
});

const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
      return res.status(404).json({ message: 'User not found' });
  }

  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
      res.status(400);
      throw new Error('All password fields are required');
  }

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
      res.status(401);
      throw new Error('Current password is incorrect');
  }

  if (newPassword !== confirmNewPassword) {
      res.status(400);
      throw new Error('New passwords do not match');
  }

  // Set new password and save
  user.password = newPassword;
  await user.save();

  res.status(200).json({ message: 'Password changed successfully!' });
});

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  sendOTP,
  verifyOTP,
  getUserProfile,
  addAvailability,
  getAvailability,
  deleteAvailability,
  updateProfile,
  changePassword,
};
