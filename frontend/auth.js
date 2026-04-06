// API Configuration
const API_BASE_URL = 'http://localhost:8000';

// Temporary storage for 2FA flow
let temp2FAData = {
    email: null
};

// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const totpForm = document.getElementById('totp-form');
const successMessage = document.getElementById('success-message');
const successText = document.getElementById('success-text');

// Form Elements
const loginFormElement = document.getElementById('loginForm');
const registerFormElement = document.getElementById('registerForm');
const totpFormElement = document.getElementById('totpForm');
const registerPassword = document.getElementById('register-password');
const registerPasswordConfirm = document.getElementById('register-password-confirm');

// Password requirements elements
const reqs = {
    length: document.getElementById('req-length'),
    uppercase: document.getElementById('req-uppercase'),
    lowercase: document.getElementById('req-lowercase'),
    number: document.getElementById('req-number')
};

// Switch between login and register forms
function switchForm(formType) {
    if (formType === 'login') {
        registerForm.classList.remove('active');
        loginForm.classList.add('active');
        totpForm.classList.remove('active');
        successMessage.style.display = 'none';
    } else if (formType === 'register') {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
        totpForm.classList.remove('active');
        successMessage.style.display = 'none';
    } else if (formType === 'totp') {
        loginForm.classList.remove('active');
        registerForm.classList.remove('active');
        totpForm.classList.add('active');
        successMessage.style.display = 'none';
    }
    clearErrors();
}

// Validate password requirements
function validatePasswordRequirements(password) {
    const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password)
    };

    Object.keys(checks).forEach(key => {
        if (checks[key]) {
            reqs[key].classList.add('met');
        } else {
            reqs[key].classList.remove('met');
        }
    });

    return Object.values(checks).every(check => check === true);
}

// Validate email format
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Clear all error messages
function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
        el.textContent = '';
    });
}

// Show error message
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
    }
}

// Disable/Enable form inputs
function toggleFormInputs(formElement, disabled) {
    const inputs = formElement.querySelectorAll('input, button');
    inputs.forEach(input => {
        input.disabled = disabled;
    });
}

// Show loading state on button
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    clearErrors();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const submitBtn = loginFormElement.querySelector('button[type="submit"]');

    // Validation
    if (!email) {
        showError('login-email-error', 'Email is required');
        return;
    }

    if (!validateEmail(email)) {
        showError('login-email-error', 'Please enter a valid email');
        return;
    }

    if (!password) {
        showError('login-password-error', 'Password is required');
        return;
    }

    setButtonLoading(submitBtn, true);
    toggleFormInputs(loginFormElement, true);

    try {
        const response = await fetch(`${API_BASE_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Check if 2FA is required
            if (data.requires_2fa && data.requires_2fa === true) {
                // Store email temporarily for 2FA verification
                temp2FAData.email = email;
                // Show TOTP form instead of redirecting
                showTOTPForm(email);
            } else {
                // No 2FA, store token and redirect
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('token_type', data.token_type);
                localStorage.setItem('user_email', email);
                // Show success message and redirect
                showLoginSuccess(email);
            }
        } else {
            // Handle error response
            const errorMessage = data.detail || 'Login failed. Please check your credentials.';
            showError('login-general-error', errorMessage);
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('login-general-error', 'Network error. Please try again.');
    } finally {
        setButtonLoading(submitBtn, false);
        toggleFormInputs(loginFormElement, false);
    }
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();
    clearErrors();

    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;
    const submitBtn = registerFormElement.querySelector('button[type="submit"]');

    // Validation
    if (!email) {
        showError('register-email-error', 'Email is required');
        return;
    }

    if (!validateEmail(email)) {
        showError('register-email-error', 'Please enter a valid email');
        return;
    }

    if (!password) {
        showError('register-password-error', 'Password is required');
        return;
    }

    if (!validatePasswordRequirements(password)) {
        showError('register-password-error', 'Password does not meet all requirements');
        return;
    }

    if (!passwordConfirm) {
        showError('register-password-confirm-error', 'Please confirm your password');
        return;
    }

    if (password !== passwordConfirm) {
        showError('register-password-confirm-error', 'Passwords do not match');
        return;
    }

    setButtonLoading(submitBtn, true);
    toggleFormInputs(registerFormElement, true);

    try {
        const response = await fetch(`${API_BASE_URL}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Show success message
            showRegisterSuccess(email);
            // Clear form
            registerFormElement.reset();
        } else {
            // Handle error response
            const errorMessage = data.detail || 'Registration failed. Please try again.';
            showError('register-general-error', errorMessage);
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError('register-general-error', 'Network error. Please try again.');
    } finally {
        setButtonLoading(submitBtn, false);
        toggleFormInputs(registerFormElement, false);
    }
}

// Show TOTP verification form
function showTOTPForm(email) {
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    successMessage.style.display = 'none';
    totpForm.classList.add('active');
    // Clear previous error
    document.getElementById('totp-error').textContent = '';
    // Focus on TOTP input
    document.getElementById('totp-code').focus();
}

// Handle TOTP verification
async function handleTOTPVerification(e) {
    e.preventDefault();
    clearErrors();

    const code = document.getElementById('totp-code').value.trim();
    const submitBtn = totpFormElement.querySelector('button[type="submit"]');

    // Validation
    if (!code) {
        showError('totp-error', 'Authentication code is required');
        return;
    }

    if (!/^\d{6}$/.test(code)) {
        showError('totp-error', 'Please enter a valid 6-digit code');
        return;
    }

    if (!temp2FAData.email) {
        showError('totp-error', 'Session expired. Please login again.');
        switchForm('login');
        return;
    }

    setButtonLoading(submitBtn, true);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-totp-login?email=${encodeURIComponent(temp2FAData.email)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code
            })
        });

        const data = await response.json();

        if (response.ok) {
            const email = temp2FAData.email; // Save email before clearing

            // Store token in localStorage
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('token_type', data.token_type);
            localStorage.setItem('user_email', email);

            // Clear 2FA temp data
            temp2FAData.email = null;

            // Show success message and redirect
            showLoginSuccess(email);
        } else {
            // Handle error response
            const errorMessage = data.detail || 'TOTP verification failed. Please try again.';
            showError('totp-error', errorMessage);
        }
    } catch (error) {
        console.error('TOTP verification error:', error);
        showError('totp-error', 'Network error. Please try again.');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// Show login success
function showLoginSuccess(email) {
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    successMessage.style.display = 'flex';
    successText.innerHTML = `
        <p>Welcome back, <strong>${email}</strong>!</p>
        <p>You have been successfully logged in.</p>
        <p style="margin-top: 15px; font-size: 12px; color: #999;">
            Redirecting to task manager... <span style="animation: spin 0.6s linear infinite; display: inline-block;">⏳</span>
        </p>
    `;

    // Redirect to tasks page after 1.5 seconds
    setTimeout(() => {
        window.location.href = 'tasks.html';
    }, 1500);
}

// Show register success
function showRegisterSuccess(email) {
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    successMessage.style.display = 'flex';
    successText.innerHTML = `
        <p>Account created successfully!</p>
        <p>Welcome, <strong>${email}</strong></p>
        <p style="margin-top: 15px; font-size: 12px; color: #999;">
            Your account is ready to use. You can now <a href="#" onclick="switchForm('login'); return false;" style="color: #667eea;">login</a> to continue.
        </p>
    `;
}

// Validate password on input
registerPassword.addEventListener('input', (e) => {
    validatePasswordRequirements(e.target.value);
});

// Validate password match
registerPasswordConfirm.addEventListener('input', (e) => {
    const error = document.getElementById('register-password-confirm-error');
    if (e.target.value !== registerPassword.value) {
        error.textContent = 'Passwords do not match';
    } else {
        error.textContent = '';
    }
});

// Form submission handlers
loginFormElement.addEventListener('submit', handleLogin);
registerFormElement.addEventListener('submit', handleRegister);
totpFormElement.addEventListener('submit', handleTOTPVerification);

// Only allow numeric input for TOTP code
document.getElementById('totp-code').addEventListener('keypress', (e) => {
    if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
    }
});

// Check if user is already logged in
window.addEventListener('load', () => {
    const token = localStorage.getItem('access_token');
    if (token) {
        const email = localStorage.getItem('user_email');
        // Redirect directly to tasks page if already logged in
        window.location.href = 'tasks.html';
    }
});

// Logout function (can be called from other pages)
function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_type');
    localStorage.removeItem('user_email');
    switchForm('login');
    clearErrors();
}
