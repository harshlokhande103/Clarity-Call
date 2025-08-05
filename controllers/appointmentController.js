const Appointment = require('../models/Appointment');
const User = require('../models/User').User;

// @desc    Create a new appointment
// @route   POST /api/appointments
// @access  Private
const createAppointment = async (req, res) => {
  try {
    const { mentorId, date, time, duration, notes } = req.body;
    
    // Check if mentor exists
    const mentor = await User.findOne({ _id: mentorId, role: 'mentor' });
    
    if (!mentor) {
      return res.status(404).json({ message: 'Mentor not found' });
    }
    
    // Create appointment
    const appointment = await Appointment.create({
      client: req.user._id,
      mentor: mentorId,
      date,
      time,
      duration,
      notes
    });
    
    res.status(201).json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all appointments for a user
// @route   GET /api/appointments
// @access  Private
const getAppointments = async (req, res) => {
  try {
    let appointments;
    
    if (req.user.role === 'client') {
      appointments = await Appointment.find({ client: req.user._id })
        .populate('mentor', 'name email')
        .sort({ date: 1, time: 1 });
    } else {
      appointments = await Appointment.find({ mentor: req.user._id })
        .populate('client', 'name email')
        .sort({ date: 1, time: 1 });
    }
    
    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get appointment by ID
// @route   GET /api/appointments/:id
// @access  Private
const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('client', 'name email')
      .populate('mentor', 'name email');
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // Check if user is part of this appointment
    if (
      appointment.client.toString() !== req.user._id.toString() &&
      appointment.mentor.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    res.json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update appointment
// @route   PUT /api/appointments/:id
// @access  Private
const updateAppointment = async (req, res) => {
  try {
    const { status, date, time, duration, notes } = req.body;
    
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // Check if user is part of this appointment
    if (
      appointment.client.toString() !== req.user._id.toString() &&
      appointment.mentor.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Update fields
    if (status) appointment.status = status;
    if (date) appointment.date = date;
    if (time) appointment.time = time;
    if (duration) appointment.duration = duration;
    if (notes) appointment.notes = notes;
    
    await appointment.save();
    
    res.json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete appointment
// @route   DELETE /api/appointments/:id
// @access  Private
const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // Check if user is part of this appointment
    if (
      appointment.client.toString() !== req.user._id.toString() &&
      appointment.mentor.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Use deleteOne instead of remove
    await Appointment.deleteOne({ _id: req.params.id });
    
    res.json({ message: 'Appointment removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment
};