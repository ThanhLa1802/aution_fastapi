# Task Manager Frontend

Modern, responsive authentication interface for user registration and login with integrated dashboard for task management.

## Features

- **User Registration** - Create new account with password validation
- **User Login** - Secure login with token management  
- **Dashboard** - View user profile and authentication status after login
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **Form Validation** - Real-time password requirements and email validation
- **Error Handling** - Clear error messages for user guidance
- **Token Management** - Automatic token storage and persistence
- **Session Protection** - Automatic redirect based on authentication status

## Workflow

1. **Start** → `index.html` (Login/Register page)
2. **New User** → Click "Register here"
   - Fill registration form with email and password
   - Password must meet all requirements
   - Account created automatically
   - Can then login
3. **Existing User** → Login with email and password
   - Token automatically saved to localStorage
   - Redirected to `dashboard.html`
4. **Dashboard** → `dashboard.html`
   - View profile information
   - See active session details
   - Start managing your tasks
   - Click "Logout" to clear session

## Setup & Running

### Option 1: Using VS Code Live Server Extension (Recommended)
1. Install "Live Server" extension in VS Code
2. Right-click on `index.html` and select "Open with Live Server"
3. The frontend will open at `http://127.0.0.1:5500`

### Option 2: Using Python's Built-in Server
```bash
cd frontend
python -m http.server 8080
```
Then open `http://localhost:8080`

### Option 3: Using Node.js http-server
```bash
npm install -g http-server
cd frontend
http-server
```

## Configuration

### API Endpoint
The frontend connects to your FastAPI backend. Ensure:
- Backend is running at `http://localhost:8000`
- CORS is properly configured (see CORS Setup below)

To change the API URL, edit `auth.js` and `dashboard.js`:
```javascript
const API_BASE_URL = 'http://localhost:8000';
```

## CORS Setup

Your FastAPI backend needs CORS enabled for the frontend to communicate. The `main.py` has been updated to allow frontend requests.

For development with different ports, the CORS settings should include your frontend URL:
```python
origins = [
    "http://localhost:8000",      # Backend
    "http://127.0.0.1:8000",      # Backend (loopback)
    "http://localhost:5500",      # VS Code Live Server
    "http://127.0.0.1:5500",      # VS Code Live Server (loopback)
    "http://localhost:8080",      # Python http.server
    "http://127.0.0.1:8080",      # Python http.server (loopback)
]
```

## File Structure

```
frontend/
├── index.html        # Login/Register page  
├── dashboard.html    # User dashboard (protected)
├── styles.css        # Login/Register styling
├── dashboard.css     # Dashboard styling
├── auth.js           # Authentication logic for login/register
├── dashboard.js      # Dashboard logic and API calls
└── README.md         # This file
```

## Authentication Flow

```
User Opens Website
    ↓
Check localStorage for token
    ├─ Token exists → Redirect to dashboard.html
    └─ No token → Show login/register form
    
User Registers
    ↓
POST /users/register (email, password)
    ↓
Account created → Show success → User can login
    
User Logs In
    ↓
POST /users/login (email, password)
    ↓
Receive JWT token → Save to localStorage
    ↓
Redirect to dashboard.html
    ↓
Dashboard.js fetches user profile
    ↓
GET /users/me (with Authorization header)
    ↓
Display user info on dashboard
```

## Pages Overview

### Login/Register (index.html)
- **Login Tab**: Existing users can log in with email and password
- **Register Tab**: New users can create an account with validation
- Form validation with helpful error messages
- Switch between forms easily
- Responsive design

### Dashboard (dashboard.html)
- **Protected Route**: Automatically redirects to login if not authenticated
- **User Profile**: Displays logged-in user's information from API
- **Session Status**: Shows active authentication status
- **Token Info**: Displays the JWT access token
- **Logout**: Securely clears session and redirects to login

## API Endpoints Integration

### Registration
- **Endpoint**: `POST /users/register`
- **Request**: 
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123"
  }
  ```
- **Response**: 
  ```json
  {
    "id": 1,
    "email": "user@example.com",
    "is_active": true
  }
  ```

### Login
- **Endpoint**: `POST /users/login`
- **Request**: 
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123"
  }
  ```
- **Response**: 
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer"
  }
  ```

### Get Current User
- **Endpoint**: `GET /users/me`
- **Headers**: 
  ```
  Authorization: Bearer <access_token>
  ```
- **Response**: 
  ```json
  {
    "id": 1,
    "email": "user@example.com",
    "is_active": true
  }
  ```

## Features in Detail

### Registration Form
- Email validation (format check)
- Password requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
- Password confirmation matching
- Real-time validation feedback with visual indicators

### Login Form
- Email and password validation
- Clear error messages for invalid credentials
- Loading state during submission
- Token automatically saved to localStorage
- Auto-redirect to dashboard on success

### Token Management
- Access tokens stored in `localStorage`
- Token persists across browser sessions
- `logout()` function securely clears session
- Token included in Authorization header for API requests

## Token Usage

After login, the token is stored and can be used for authenticated requests:

```javascript
const token = localStorage.getItem('access_token');
const headers = {
    'Authorization': `Bearer ${token}`
};

// Example: Making authenticated request
fetch('http://localhost:8000/users/me', {
    method: 'GET',
    headers: headers
})
.then(response => response.json())
.then(data => console.log(data));
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### "Network error" when submitting
1. Check if backend is running on `http://localhost:8000`
2. Verify CORS is enabled in `main.py`
3. Check browser console for detailed errors (F12 → Console)

### Form not responding
1. Clear browser cache (Ctrl+Shift+Delete)
2. Check browser console for JavaScript errors
3. Verify all files (HTML, CSS, JS) are loaded

### Token not working
1. Check if token is saved: Open DevTools → Application → Local Storage
2. Verify token format in network requests (Authorization header)
3. Ensure backend is returning valid JWT tokens

### Can't access dashboard after login
1. Check if localStorage has the access_token
2. Try logging in again
3. Check backend response in Network tab

## Development Notes

- Password validation is performed client-side for UX; backend enforces validation too
- Tokens are stored in localStorage (for production, use httpOnly cookies)
- All user data and authentication state is managed by the FastAPI backend
- The frontend is a stateless UI that relies on JWT tokens for authentication

## Next Steps

- Add task creation and management interface
- Implement task list view with filtering
- Add task details and editing
- Create task completion tracking
- Implement task categories/priorities
