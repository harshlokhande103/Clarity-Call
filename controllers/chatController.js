const Chat = require('../models/Chat');
const Appointment = require('../models/Appointment');

// @desc    Create a new chat or get existing chat
// @route   POST /api/chats
// @access  Private
const createOrGetChat = async (req, res) => {
  try {
    const { mentorId: mentorIdFromBody, appointmentId } = req.body;
    
    // Check if appointment exists and belongs to the user
    let appointment;
    if (appointmentId) {
      appointment = await Appointment.findById(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }
      
      if (
        appointment.client.toString() !== req.user._id.toString() &&
        appointment.mentor.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }
    
    // Determine client and mentor IDs
    let clientId, mentorId;
    
    if (req.user.role === 'client') {
      clientId = req.user._id;
      mentorId = mentorIdFromBody || (appointmentId ? appointment.mentor : null);
    } else {
      mentorId = req.user._id;
      clientId = appointmentId ? appointment.client : null;
    }
    
    if (!clientId || !mentorId) {
      return res.status(400).json({ message: 'Client and mentor IDs are required' });
    }
    
    // Check if chat already exists
    let chat = await Chat.findOne({
      client: clientId,
      mentor: mentorId,
      isActive: true
    });
    
    // If no active chat exists, create a new one
    if (!chat) {
      chat = await Chat.create({
        client: clientId,
        mentor: mentorId,
        appointment: appointmentId,
        messages: []
      });
    }
    
    res.status(201).json(chat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Send a message in a chat
// @route   POST /api/chats/:id/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    
    const chat = await Chat.findById(req.params.id);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if user is part of this chat
    if (
      chat.client.toString() !== req.user._id.toString() &&
      chat.mentor.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Add message to chat
    chat.messages.push({
      sender: req.user._id,
      content
    });
    
    await chat.save();
    
    res.status(201).json(chat.messages[chat.messages.length - 1]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all messages in a chat
// @route   GET /api/chats/:id/messages
// @access  Private
const getMessages = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('messages.sender', 'name role');
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if user is part of this chat
    if (
      chat.client.toString() !== req.user._id.toString() &&
      chat.mentor.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    res.json(chat.messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all chats for a user
// @route   GET /api/chats
// @access  Private
const getUserChats = async (req, res) => {
  try {
    let chats;
    
    if (req.user.role === 'client') {
      chats = await Chat.find({ client: req.user._id, isActive: true })
        .populate('mentor', 'name')
        .populate('appointment')
        .sort({ updatedAt: -1 });
    } else {
      chats = await Chat.find({ mentor: req.user._id, isActive: true })
        .populate('client', 'name')
        .populate('appointment')
        .sort({ updatedAt: -1 });
    }
    
    res.json(chats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  createOrGetChat,
  sendMessage,
  getMessages,
  getUserChats
};