// DOM Elements
const mentorsList = document.getElementById('mentors-list');
const appointmentsList = document.getElementById('appointments-list');
const chatsList = document.getElementById('chats-list');
const availabilityForm = document.getElementById('availability-form');
const availabilityList = document.getElementById('availability-list');
const searchMentor = document.getElementById('search-mentor');
// Availability Modal Elements
const addAvailabilityBtn = document.getElementById('add-availability');
const availabilityModal = document.getElementById('availability-modal');
const availabilityModalClose = document.querySelector('#availability-modal .close-availability');
const saveAvailabilityBtn = availabilityModal.querySelector('.btn-success');
const cancelAvailabilityBtn = document.getElementById('cancel-availability');

// Save availability
saveAvailabilityBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const day = document.getElementById('day').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    if (!day || !startTime || !endTime) {
        alert('Please fill in all fields');
        return;
    }
    try {
        const response = await fetch('/api/users/availability', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ day, startTime, endTime })
        });
        if (!response.ok) {
            throw new Error('Failed to add availability');
        }
        const data = await response.json();
        alert('Availability added successfully!');
        await loadAvailability();
        toggleAvailabilityModal();
        
        // Reset form
        document.getElementById('day').value = '';
        document.getElementById('startTime').value = '';
        document.getElementById('endTime').value = '';
    } catch (error) {
        console.error('Error adding availability:', error);
        alert('Failed to add availability. Please try again.');
    }
});

// Become a mentor modal
const becomeMentorBtn = document.getElementById('become-mentor-btn');
const mentorModal = document.getElementById('mentor-modal');
const closeMentorModalBtn = document.querySelector('.close-mentor-modal'); // Assuming a class 'close-mentor-modal' for the close button

function toggleBecomeMentorModal() {
    if (mentorModal) {
        mentorModal.style.display = mentorModal.style.display === 'block' ? 'none' : 'block';
    }
}

if (becomeMentorBtn) {
    becomeMentorBtn.addEventListener('click', toggleBecomeMentorModal);
}

if (closeMentorModalBtn) {
    closeMentorModalBtn.addEventListener('click', toggleBecomeMentorModal);
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    if (event.target === mentorModal) {
        toggleBecomeMentorModal();
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
                window.location.reload(); // Reload to reflect mentor status
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

// Update availability list
function updateAvailabilityList(availability) {
    console.log('Updating availability list with:', availability);
    const list = document.getElementById('availability-list');
    
    if (!list) {
        console.error('Availability list element not found!');
        return;
    }

    if (!availability || availability.length === 0) {
        console.log('No availability slots found');
        list.innerHTML = '<p class="no-slots">No availability slots added yet.</p>';
        return;
    }

    list.innerHTML = ''; // Clear existing content
    
    availability.forEach((slot, index) => {
        const slotElement = document.createElement('div');
        slotElement.className = 'availability-slot';
        slotElement.innerHTML = `
            <p><strong>Day:</strong> ${slot.day}</p>
            <p><strong>Time:</strong> ${slot.startTime} - ${slot.endTime}</p>
            <button class="btn btn-danger btn-sm remove-slot" data-index="${index}">Remove</button>
        `;
        list.appendChild(slotElement);
    });

    console.log('Availability slots rendered:', availability.length);
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-slot').forEach(button => {
        button.addEventListener('click', async () => {
            console.log('Remove button clicked for index:', button.getAttribute('data-index'));
            if (confirm('Are you sure you want to remove this availability slot?')) {
                try {
                    const index = button.getAttribute('data-index');
                    const response = await fetch(`/api/users/availability/${index}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include'
                    });

                    if (!response.ok) {
                        throw new Error('Failed to remove availability');
                    }

                    console.log('Availability slot removed successfully');
                    await loadAvailability(); // Reload availability after removal
                } catch (error) {
                    console.error('Error removing availability:', error);
                    alert('Failed to remove availability. Please try again.');
                }
            }
        });
    });
}

// Function to fetch user profile
async function fetchUserProfile() {
    try {
        const response = await fetch('/api/users/profile', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error; // Re-throw to be caught by loadAvailability
    }
}

// Load mentor availability
async function loadAvailability() {
    console.log('Loading availability...');
    try {
        const profile = await fetchUserProfile(); // Assuming fetchUserProfile exists and works
        const availabilityList = document.getElementById('availability-list');
        
        if (!profile || !availabilityList) {
            console.log('No profile or availability list found');
            return;
        }
        
        console.log('Profile data:', profile);
        const availability = profile.availability || [];
        
        console.log('Availability slots:', availability);
        
        if (availability.length === 0) {
            availabilityList.innerHTML = '<p class="no-slots">No availability slots added yet.</p>';
            return;
        }
        
        updateAvailabilityList(availability);
        
        // Event listeners for delete buttons are now handled inside updateAvailabilityList
    } catch (error) {
        console.error('Error loading availability:', error);
        const availabilityList = document.getElementById('availability-list');
        if (availabilityList) {
            availabilityList.innerHTML = '<p class="error-message">Error loading availability. Please try again later.</p>';
        }
    }
}

// Modal functionality
function toggleAvailabilityModal() {
    availabilityModal.style.display = availabilityModal.style.display === 'block' ? 'none' : 'block';
}

// Event Listeners for availability modal
addAvailabilityBtn.addEventListener('click', () => {
    availabilityModal.style.display = 'block';
});
availabilityModalClose.addEventListener('click', () => {
    availabilityModal.style.display = 'none';
});
cancelAvailabilityBtn.addEventListener('click', () => {
    availabilityModal.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === availabilityModal) {
        availabilityModal.style.display = 'none';
    }
});

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadAvailability();
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
});

// Remove the duplicate updateAvailabilityList function from here onwards
function updateAvailabilityList(availability) {
    const list = document.getElementById('availability-list');
    
    if (!availability || availability.length === 0) {
        list.innerHTML = '<p>No availability slots added yet.</p>';
        return;
    }

    let html = '<ul class="availability-slots">';
    availability.forEach((slot, index) => {
        html += `
            <li>
                <span>${slot.day}: ${slot.startTime} - ${slot.endTime}</span>
                <button class="remove-slot" data-id="${slot._id}">Remove</button>
            </li>
        `;
    });
    html += '</ul>';
    list.innerHTML = html;

    document.querySelectorAll('.remove-slot').forEach(button => {
        button.addEventListener('click', async (e) => {
            const slotId = e.target.dataset.id;
            if (confirm('Are you sure you want to remove this slot?')) {
                try {
                    const response = await fetch(`/api/users/availability/${slotId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include'
                    });
                    if (response.ok) {
                        loadAvailability(); // Reload the list
                    } else {
                        alert('Failed to remove slot.');
                    }
                } catch (error) {
                    console.error('Error removing slot:', error);
                    alert('Error removing slot.');
                }
            }
        });
    });
}