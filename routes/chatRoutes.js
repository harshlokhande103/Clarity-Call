const express = require('express');
const router = express.Router();
const {
  createOrGetChat,
  sendMessage,
  getMessages,
  getUserChats
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

// Create a new chat or get existing chat
router.post('/', protect, createOrGetChat);

// Get all chats for the logged-in user
router.get('/', protect, getUserChats);

// Send a message in a chat
router.post('/:id/messages', protect, sendMessage);

// Get all messages in a chat
router.get('/:id/messages', protect, getMessages);

module.exports = router;