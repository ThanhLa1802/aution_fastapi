// API Configuration
const API_BASE_URL = 'http://localhost:8000';

// State Management
let allTasks = [];
let currentSection = 'overview';

// Initialize
async function initializeTasks() {
    const token = localStorage.getItem('access_token');
    const email = localStorage.getItem('user_email');

    // Check if user is logged in
    if (!token || !email) {
        redirectToLogin();
        return;
    }

    // Set user email in navbar
    document.getElementById('user-email').textContent = email;

    // Load tasks
    await loadTasks();

    // Setup form listeners
    document.getElementById('createTaskForm').addEventListener('submit', handleCreateTask);
    document.getElementById('editTaskForm').addEventListener('submit', handleEditTask);
}

// Load all tasks
async function loadTasks() {
    const token = localStorage.getItem('access_token');

    try {
        const response = await fetch(`${API_BASE_URL}/tasks/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            allTasks = await response.json();
            renderTasks();
            updateStats();
        } else if (response.status === 401) {
            handleTokenExpired();
        } else {
            console.error('Failed to load tasks');
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Create new task
async function handleCreateTask(e) {
    e.preventDefault();

    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const token = localStorage.getItem('access_token');

    // Validation
    if (!title) {
        showError('title-error', 'Title is required');
        return;
    }

    if (!description) {
        showError('description-error', 'Description is required');
        return;
    }

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/tasks/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                description
            })
        });

        if (response.ok) {
            const newTask = await response.json();
            allTasks.push(newTask);

            // Clear form
            document.getElementById('createTaskForm').reset();
            clearAllErrors();

            // Re-render
            renderTasks();
            updateStats();

            // Show success message
            showSuccessNotification('Task created successfully!');
        } else if (response.status === 401) {
            handleTokenExpired();
        } else {
            const data = await response.json();
            showError('create-error', data.detail || 'Failed to create task');
        }
    } catch (error) {
        console.error('Error creating task:', error);
        showError('create-error', 'Network error. Please try again.');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
}

// Delete task
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }

    const token = localStorage.getItem('access_token');

    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            allTasks = allTasks.filter(task => task.id !== taskId);
            renderTasks();
            updateStats();
            showSuccessNotification('Task deleted successfully!');
        } else if (response.status === 401) {
            handleTokenExpired();
        } else {
            alert('Failed to delete task');
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        alert('Network error. Please try again.');
    }
}

// Render tasks
function renderTasks() {
    const overview = document.getElementById('tasks-overview');
    const active = document.getElementById('tasks-active');
    const completed = document.getElementById('tasks-completed');

    // Clear containers
    overview.innerHTML = '';
    active.innerHTML = '';
    completed.innerHTML = '';

    if (allTasks.length === 0) {
        overview.innerHTML = '<div class="empty-state"><p>📝 No tasks yet. Create your first task to get started!</p></div>';
        active.innerHTML = '<div class="empty-state"><p>✅ All tasks completed or no active tasks</p></div>';
        completed.innerHTML = '<div class="empty-state"><p>🎉 No completed tasks yet</p></div>';
        return;
    }

    // Separate tasks by completion status
    const activeTasks = allTasks.filter(task => !task.is_completed);
    const completedTasks = allTasks.filter(task => task.is_completed);

    // Render overview (all tasks)
    if (allTasks.length === 0) {
        overview.innerHTML = '<div class="empty-state"><p>📝 No tasks yet. Create your first task to get started!</p></div>';
    } else {
        allTasks.forEach(task => {
            overview.appendChild(createTaskCard(task));
        });
    }

    // Render active tasks
    if (activeTasks.length === 0) {
        active.innerHTML = '<div class="empty-state"><p>✅ All tasks completed or no active tasks</p></div>';
    } else {
        activeTasks.forEach(task => {
            active.appendChild(createTaskCard(task));
        });
    }

    // Render completed tasks
    if (completedTasks.length === 0) {
        completed.innerHTML = '<div class="empty-state"><p>🎉 No completed tasks yet</p></div>';
    } else {
        completedTasks.forEach(task => {
            completed.appendChild(createTaskCard(task));
        });
    }
}

// Create task card element
function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-card ${task.is_completed ? 'completed' : ''}`;
    card.innerHTML = `
        <input 
            type="checkbox" 
            class="task-checkbox" 
            ${task.is_completed ? 'checked' : ''}
            onchange="markTaskCompleted(${task.id}, this.checked)"
        >
        <div class="task-content">
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div class="task-description">${escapeHtml(task.description)}</div>
        </div>
        <div class="task-actions">
            <button class="task-btn edit" onclick="openEditModal(${task.id})">✏️ Edit</button>
            <button class="task-btn delete" onclick="deleteTask(${task.id})">🗑️ Delete</button>
        </div>
    `;
    return card;
}

// Show section
function showSection(section) {
    currentSection = section;

    // Update sidebar active state
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.classList.add('active');

    // Hide all sections
    document.querySelectorAll('.section').forEach(s => {
        s.classList.remove('active');
    });

    // Show selected section
    const sectionElement = document.getElementById(`${section}-section`);
    if (sectionElement) {
        sectionElement.classList.add('active');
    }
}

// Update statistics
function updateStats() {
    const totalCount = allTasks.length;
    const activeCount = allTasks.filter(task => !task.is_completed).length;

    document.getElementById('total-tasks').textContent = totalCount;
    document.getElementById('active-count').textContent = activeCount;
}

// Show error message
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
    }
}

// Clear all errors
function clearAllErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
        el.textContent = '';
    });
}

// Show success notification
function showSuccessNotification(message) {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        z-index: 3000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Close task modal
function closeTaskModal() {
    document.getElementById('taskModal').style.display = 'none';
}

// Mark task as completed
async function markTaskCompleted(taskId, isCompleted) {
    const token = localStorage.getItem('access_token');

    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/complete`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                is_completed: isCompleted
            })
        });

        if (response.ok) {
            const updatedTask = await response.json();
            // Update task in array
            const taskIndex = allTasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                allTasks[taskIndex] = updatedTask;
            }
            renderTasks();
            updateStats();
            const message = isCompleted ? 'Task marked as completed!' : 'Task marked as active!';
            showSuccessNotification(message);
        } else if (response.status === 401) {
            handleTokenExpired();
        } else {
            alert('Failed to update task status');
        }
    } catch (error) {
        console.error('Error updating task:', error);
        alert('Network error. Please try again.');
    }
}

// Open edit modal
function openEditModal(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    // Store task ID for editing
    window.currentEditingTaskId = taskId;

    // Populate form
    document.getElementById('edit-title').value = task.title;
    document.getElementById('edit-description').value = task.description;

    // Show modal
    document.getElementById('editModal').style.display = 'flex';
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    window.currentEditingTaskId = null;
    clearError('edit-title-error');
    clearError('edit-description-error');
    clearError('edit-error');
}

// Handle edit task
async function handleEditTask(e) {
    e.preventDefault();

    const taskId = window.currentEditingTaskId;
    if (!taskId) return;

    const title = document.getElementById('edit-title').value.trim();
    const description = document.getElementById('edit-description').value.trim();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const token = localStorage.getItem('access_token');

    // Validation
    if (!title) {
        showError('edit-title-error', 'Title is required');
        return;
    }

    if (!description) {
        showError('edit-description-error', 'Description is required');
        return;
    }

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                description
            })
        });

        if (response.ok) {
            const updatedTask = await response.json();
            // Update task in array
            const taskIndex = allTasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                allTasks[taskIndex] = updatedTask;
            }
            renderTasks();
            closeEditModal();
            showSuccessNotification('Task updated successfully!');
        } else if (response.status === 401) {
            handleTokenExpired();
        } else {
            const data = await response.json();
            showError('edit-error', data.detail || 'Failed to update task');
        }
    } catch (error) {
        console.error('Error updating task:', error);
        showError('edit-error', 'Network error. Please try again.');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
}

// Clear specific error
function clearError(elementId) {
    const error = document.getElementById(elementId);
    if (error) error.textContent = '';
}

// Handle token expired
function handleTokenExpired() {
    alert('Your session has expired. Please login again.');
    logout();
}

// Logout
function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_type');
    localStorage.removeItem('user_email');
    redirectToLogin();
}

// Handle logout button
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        logout();
    }
}

// Redirect to login
function redirectToLogin() {
    window.location.href = 'index.html';
}

// HTML escape function
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeTasks);

// Close modal on outside click
window.addEventListener('click', (event) => {
    const editModal = document.getElementById('editModal');
    const taskModal = document.getElementById('taskModal');
    if (event.target === editModal) {
        closeEditModal();
    }
    if (event.target === taskModal) {
        closeTaskModal();
    }
});

// Check token validity periodically
setInterval(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        redirectToLogin();
    }
}, 60000); // Check every minute
