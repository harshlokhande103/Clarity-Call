// models/PasswordReset.js
const mongoose = require('mongoose');

const passwordResetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  // Add indexes for better query performance
  email: { type: String }, // Removed required: true
  resetCode: { type: String }, // Removed required: true
  isValid: { type: Boolean, default: true }
});

// Add index for faster lookups
passwordResetSchema.index({ email: 1, resetCode: 1 });
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PasswordReset', passwordResetSchema);
