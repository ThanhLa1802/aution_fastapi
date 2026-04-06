// API Configuration
const API_BASE_URL = 'http://localhost:8000';

// Initialize Dashboard
async function initializeDashboard() {
    const token = localStorage.getItem('access_token');
    const email = localStorage.getItem('user_email');

    // Check if user is logged in
    if (!token || !email) {
        redirectToLogin();
        return;
    }

    // Update UI with user email
    document.getElementById('user-email').textContent = email;
    document.getElementById('login-time').textContent = new Date().toLocaleString();
    document.getElementById('token-display').textContent = `${token.substring(0, 50)}...`;

    // Fetch user profile
    await fetchUserProfile(email, token);
}

// Fetch user profile from backend
async function fetchUserProfile(email, token) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const user = await response.json();
            displayUserProfile(user);
        } else if (response.status === 401) {
            // Token is invalid or expired
            handleTokenExpired();
        } else {
            showProfileError('Failed to load profile');
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        showProfileError('Network error while loading profile');
    }
}

// Display user profile information
function displayUserProfile(user) {
    const profileContent = document.getElementById('profile-content');
    profileContent.innerHTML = `
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Status:</strong> <span style="color: #27ae60;">${user.is_active ? '✓ Active' : '✗ Inactive'}</span></p>
        <p><strong>User ID:</strong> ${user.id}</p>
    `;
}

// Show profile error
function showProfileError(message) {
    const profileContent = document.getElementById('profile-content');
    profileContent.innerHTML = `<p style="color: #e74c3c;">${message}</p>`;
}

// Handle token expiration
function handleTokenExpired() {
    alert('Your session has expired. Please login again.');
    logout();
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        logout();
    }
}

// Logout function
function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_type');
    localStorage.removeItem('user_email');
    redirectToLogin();
}

// Redirect to login page
function redirectToLogin() {
    window.location.href = 'index.html';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeDashboard);

// Optional: Refresh token validity periodically
setInterval(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
        // You can add token refresh logic here if your backend supports it
        // For now, we'll just keep the user logged in as long as the token exists
    } else {
        redirectToLogin();
    }
}, 60000); // Check every minute
