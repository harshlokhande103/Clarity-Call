// DOM Elements
const mentorsList = document.getElementById('mentors-list');
const appointmentsList = document.getElementById('appointments-list');
const chatsList = document.getElementById('chats-list');
const availabilityForm = document.getElementById('availability-form');
const availabilityList = document.getElementById('availability-list');
const searchMentor = document.getElementById('search-mentor');

// Get token from cookies instead of localStorage
function getTokenFromCookie() {
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith('token=')) {
      return cookie.substring(6);
    }
  }
  return null;
}

const token = getTokenFromCookie();

// Headers for API requests
const headers = {
  'Content-Type': 'application/json'
  // No need for Authorization header with Bearer token as we're using cookies
};

// Fetch user profile
async function fetchUserProfile() {
  try {
    const response = await fetch('/api/users/profile', {
      headers,
      credentials: 'include' // Include cookies in the request
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

// Fetch mentors
async function fetchMentors(query = '') {
  try {
    const response = await fetch(`/api/users/mentors?search=${query}`, {
      headers,
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch mentors');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching mentors:', error);
    return [];
  }
}

// Fetch appointments
async function fetchAppointments() {
  try {
    const response = await fetch('/api/appointments', {
      headers,
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch appointments');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }
}

// Fetch chats
async function fetchChats() {
  try {
    const response = await fetch('/api/chats', {
      headers,
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch chats');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching chats:', error);
    return [];
  }
}

// Render mentors list
function renderMentors(mentors) {
  if (!mentorsList) return;
  
  mentorsList.innerHTML = '';
  
  if (mentors.length === 0) {
    mentorsList.innerHTML = '<p>No mentors found.</p>';
    return;
  }
  
  mentors.forEach(mentor => {
    const mentorCard = document.createElement('div');
    mentorCard.className = 'card';
    
    // Handle different mentor data structures
    const mentorName = mentor.user ? mentor.user.name : mentor.name;
    const mentorId = mentor.user ? mentor.user._id : mentor._id;
    
    mentorCard.innerHTML = `
      <div class="card-header">
        <h3>${mentorName}</h3>
        <span class="badge">${mentor.specialization || 'General'}</span>
      </div>
      <div class="card-body">
        <p>${mentor.bio || 'No bio available'}</p>
        <p><strong>Experience:</strong> ${mentor.experience || 0} years</p>
        <p><strong>Rate:</strong> $${mentor.hourlyRate || 0}/hour</p>
      </div>
      <div class="card-footer">
        <button class="btn btn-primary book-appointment" data-id="${mentorId}">Book Appointment</button>
        <button class="btn btn-secondary start-chat" data-id="${mentorId}">Chat</button>
      </div>
    `;
    mentorsList.appendChild(mentorCard);
  });
  
  // Add event listeners to book appointment buttons
  document.querySelectorAll('.book-appointment').forEach(button => {
    button.addEventListener('click', () => {
      const mentorId = button.getAttribute('data-id');
      window.location.href = `/book-appointment/${mentorId}`;
    });
  });
  
  // Add event listeners to chat buttons
  document.querySelectorAll('.start-chat').forEach(button => {
    button.addEventListener('click', () => {
      const mentorId = button.getAttribute('data-id');
      window.location.href = `/chat/new/${mentorId}`;
    });
  });
}

// Render appointments list
function renderAppointments(appointments) {
  if (!appointmentsList) return;
  
  appointmentsList.innerHTML = '';
  
  if (appointments.length === 0) {
    appointmentsList.innerHTML = '<p>No appointments found.</p>';
    return;
  }
  
  appointments.forEach(appointment => {
    const appointmentCard = document.createElement('div');
    appointmentCard.className = 'card';
    
    const date = new Date(appointment.date).toLocaleDateString();
    const otherPerson = appointment.client ? appointment.client.name : appointment.mentor.name;
    
    // Handle different time formats
    const startTime = appointment.startTime || appointment.time || '';
    const endTime = appointment.endTime || '';
    const timeDisplay = endTime ? `${startTime} - ${endTime}` : startTime;
    
    appointmentCard.innerHTML = `
      <div class="card-header">
        <h3>Appointment with ${otherPerson}</h3>
        <span class="badge ${getStatusClass(appointment.status)}">${appointment.status}</span>
      </div>
      <div class="card-body">
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Time:</strong> ${timeDisplay}</p>
        <p><strong>Duration:</strong> ${appointment.duration || 60} minutes</p>
        <p><strong>Notes:</strong> ${appointment.notes || 'No notes'}</p>
      </div>
      <div class="card-footer">
        ${appointment.status !== 'cancelled' ? 
          `<button class="btn btn-danger cancel-appointment" data-id="${appointment._id}">Cancel</button>` : ''}
        <button class="btn btn-secondary start-chat" data-id="${appointment._id}">Chat</button>
      </div>
    `;
    appointmentsList.appendChild(appointmentCard);
  });
  
  // Add event listeners to cancel buttons
  document.querySelectorAll('.cancel-appointment').forEach(button => {
    button.addEventListener('click', async () => {
      const appointmentId = button.getAttribute('data-id');
      await cancelAppointment(appointmentId);
    });
  });
  
  // Add event listeners to chat buttons
  document.querySelectorAll('.start-chat').forEach(button => {
    button.addEventListener('click', () => {
      const appointmentId = button.getAttribute('data-id');
      window.location.href = `/chat/${appointmentId}`;
    });
  });
}

// Render chats list
function renderChats(chats) {
  if (!chatsList) return;
  
  chatsList.innerHTML = '';
  
  if (chats.length === 0) {
    chatsList.innerHTML = '<p>No chats found.</p>';
    return;
  }
  
  chats.forEach(chat => {
    const chatCard = document.createElement('div');
    chatCard.className = 'card';
    
    const otherPerson = chat.client ? chat.client.name : chat.mentor.name;
    const lastMessage = chat.messages && chat.messages.length > 0 ? 
      chat.messages[chat.messages.length - 1].content : 'No messages yet';
    
    const lastMessageTime = chat.messages && chat.messages.length > 0 ? 
      new Date(chat.messages[chat.messages.length - 1].timestamp).toLocaleTimeString() : '';
    
    chatCard.innerHTML = `
      <div class="card-header">
        <h3>Chat with ${otherPerson}</h3>
      </div>
      <div class="card-body">
        <p>${lastMessage.substring(0, 50)}${lastMessage.length > 50 ? '...' : ''}</p>
        <small>${lastMessageTime}</small>
      </div>
      <div class="card-footer">
        <button class="btn btn-primary open-chat" data-id="${chat._id}">Open Chat</button>
      </div>
    `;
    chatsList.appendChild(chatCard);
  });
  
  // Add event listeners to open chat buttons
  document.querySelectorAll('.open-chat').forEach(button => {
    button.addEventListener('click', () => {
      const chatId = button.getAttribute('data-id');
      window.location.href = `/chat/${chatId}`;
    });
  });
}

// Helper function to get status class for appointment
function getStatusClass(status) {
  switch (status) {
    case 'pending':
      return 'badge-warning';
    case 'confirmed':
      return 'badge-success';
    case 'cancelled':
      return 'badge-danger';
    case 'completed':
      return 'badge-info';
    default:
      return 'badge-secondary';
  }
}

// Cancel appointment
async function cancelAppointment(appointmentId) {
  if (!confirm('Are you sure you want to cancel this appointment?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/appointments/${appointmentId}`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify({ status: 'cancelled' })
    });
    
    if (!response.ok) {
      throw new Error('Failed to cancel appointment');
    }
    
    alert('Appointment cancelled successfully!');
    // Refresh appointments list
    const appointments = await fetchAppointments();
    renderAppointments(appointments);
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    alert('Failed to cancel appointment. Please try again.');
  }
}

// Add availability slot
async function addAvailability(e) {
  e.preventDefault();
  
  const day = document.getElementById('day').value;
  const startTime = document.getElementById('start-time').value;
  const endTime = document.getElementById('end-time').value;
  
  try {
    const response = await fetch('/api/users/availability', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ day, startTime, endTime })
    });
    
    if (!response.ok) {
      throw new Error('Failed to add availability');
    }
    
    alert('Availability added successfully!');
    // Reset form
    document.getElementById('availability-form').reset();
    // Refresh availability list
    await loadAvailability();
  } catch (error) {
    console.error('Error adding availability:', error);
    alert('Failed to add availability. Please try again.');
  }
}

// Load mentor availability
async function loadAvailability() {
  try {
    const profile = await fetchUserProfile();
    
    if (!profile || !availabilityList) return;
    
    const availability = profile.availability || [];
    
    if (availability.length === 0) {
      availabilityList.innerHTML = '<p>No availability slots added yet.</p>';
      return;
    }
    
    let availabilityHTML = '<ul class="availability-slots">';
    
    availability.forEach((slot, index) => {
      availabilityHTML += `
        <li>
          ${slot.day}: ${slot.startTime} - ${slot.endTime}
          <button class="btn-delete" data-index="${index}">Remove</button>
        </li>
      `;
    });
    
    availabilityHTML += '</ul>';
    
    availabilityList.innerHTML = availabilityHTML;
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.btn-delete').forEach(button => {
      button.addEventListener('click', async () => {
        const index = button.getAttribute('data-index');
        await removeAvailabilitySlot(index);
      });
    });
  } catch (error) {
    console.error('Error loading availability:', error);
    if (availabilityList) {
      availabilityList.innerHTML = '<p>Error loading availability. Please try again later.</p>';
    }
  }
}

// Remove availability slot
async function removeAvailabilitySlot(index) {
  if (!confirm('Are you sure you want to remove this availability slot?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/users/availability/${index}`, {
      method: 'DELETE',
      headers,
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to remove availability slot');
    }
    
    alert('Availability slot removed successfully!');
    // Refresh availability list
    await loadAvailability();
  } catch (error) {
    console.error('Error removing availability slot:', error);
    alert('Failed to remove availability slot. Please try again.');
  }
}

// Helper function to render appointment card
function renderAppointmentCard(appointment, container, role) {
  const appointmentCard = document.createElement('div');
  appointmentCard.className = 'card';
  
  const date = new Date(appointment.date).toLocaleDateString();
  const otherPerson = role === 'client' ? 
    (appointment.mentor.name || 'Mentor') : 
    (appointment.client.name || 'Client');
  
  appointmentCard.innerHTML = `
    <div class="card-header">
      <h3>Session with ${otherPerson}</h3>
      <span class="badge ${getStatusClass(appointment.status)}">${appointment.status || 'scheduled'}</span>
    </div>
    <div class="card-body">
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${appointment.time || 'Not specified'}</p>
      <p><strong>Duration:</strong> ${appointment.duration || 60} minutes</p>
      <p><strong>Notes:</strong> ${appointment.notes || 'No notes'}</p>
    </div>
    <div class="card-footer">
      ${appointment.status !== 'cancelled' ? 
        `<button class="btn btn-danger cancel-appointment" data-id="${appointment._id}">Cancel</button>` : ''}
      <button class="btn btn-secondary start-chat" data-id="${appointment._id}">Chat</button>
    </div>
  `;
  
  container.appendChild(appointmentCard);
}

// Initialize dashboard based on user role
async function initDashboard() {
  // Fetch user profile
  const profile = await fetchUserProfile();
  
  if (!profile) {
    // Handle case where profile couldn't be fetched
    console.error('Could not fetch user profile');
    return;
  }
  
  // Set up search functionality if on client dashboard
  if (searchMentor) {
    searchMentor.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      
      const mentorCards = mentorsList.querySelectorAll('.card');
      
      mentorCards.forEach(card => {
        const mentorName = card.querySelector('h3').textContent.toLowerCase();
        const mentorSpecialization = card.querySelector('.badge').textContent.toLowerCase();
        const mentorBio = card.querySelector('.card-body p').textContent.toLowerCase();
        
        if (
          mentorName.includes(searchTerm) || 
          mentorSpecialization.includes(searchTerm) || 
          mentorBio.includes(searchTerm)
        ) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }
  
  // Set up availability form if on mentor dashboard
  if (availabilityForm) {
    availabilityForm.addEventListener('submit', addAvailability);
    loadAvailability();
  }
  
  // Load mentors if on client dashboard
  if (mentorsList) {
    const mentors = await fetchMentors();
    renderMentors(mentors);
  }
  
  // Load appointments for all users
  if (appointmentsList) {
    const appointments = await fetchAppointments();
    renderAppointments(appointments);
  }
  
  // Load chats for all users
  if (chatsList) {
    const chats = await fetchChats();
    renderChats(chats);
  }
}

// Tab functionality
document.addEventListener('DOMContentLoaded', function() {
  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons and panes
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));
      
      // Add active class to clicked button
      this.classList.add('active');
      
      // Show corresponding tab pane
      const tabId = this.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // Become a mentor modal
  const becomeBtn = document.getElementById('become-mentor-btn');
  const mentorModal = document.getElementById('mentor-modal');
  const closeBtn = document.querySelector('.close');
  
  if (becomeBtn) {
    becomeBtn.addEventListener('click', function() {
      mentorModal.style.display = 'block';
    });
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      mentorModal.style.display = 'none';
    });
  }
  
  // Close modal when clicking outside
  window.addEventListener('click', function(event) {
    if (event.target === mentorModal) {
      mentorModal.style.display = 'none';
    }
  });
  
  // Handle mentor form submission
  const mentorForm = document.getElementById('mentor-form');
  if (mentorForm) {
    mentorForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const formData = {
        specialization: document.getElementById('specialization').value,
        experience: document.getElementById('experience').value,
        hourlyRate: document.getElementById('hourlyRate').value,
        bio: document.getElementById('bio').value
      };
      
      try {
        const response = await fetch('/api/users/become-mentor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData),
          credentials: 'include'
        });
        
        if (response.ok) {
          alert('Congratulations! You are now a mentor.');
          window.location.reload();
        } else {
          const data = await response.json();
          alert(`Error: ${data.message || 'Something went wrong'}`);
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Failed to become a mentor. Please try again.');
      }
    });
  }
  
  // Initialize dashboard data
  initDashboard();
});