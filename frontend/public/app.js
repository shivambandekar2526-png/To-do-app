// State Management
let todos = [];
let activeStatusFilter = 'all'; // 'all' | 'active' | 'completed'
let activeCategoryFilter = 'All';
let activePriorityFilter = 'All';
let searchQuery = '';
let editingTaskId = null;

// DOM Elements
const taskList = document.getElementById('taskList');
const tasksLoading = document.getElementById('tasksLoading');
const tasksEmpty = document.getElementById('tasksEmpty');
const emptyTitle = document.getElementById('emptyTitle');
const emptySubtitle = document.getElementById('emptySubtitle');
const emptyActionBtn = document.getElementById('emptyActionBtn');

const totalTasksCount = document.getElementById('totalTasksCount');
const pendingTasksCount = document.getElementById('pendingTasksCount');
const completedTasksCount = document.getElementById('completedTasksCount');
const progressPercent = document.getElementById('progressPercent');
const progressBarFill = document.getElementById('progressBarFill');

const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const categoryFilter = document.getElementById('categoryFilter');
const priorityFilter = document.getElementById('priorityFilter');
const statusTabs = document.querySelectorAll('.status-tab');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

const cloudStatusBadge = document.getElementById('cloudStatusBadge');
const cloudStatusText = document.getElementById('cloudStatusText');
const refreshSyncBtn = document.getElementById('refreshSyncBtn');
const lastSyncLabel = document.getElementById('lastSyncLabel');

const taskModal = document.getElementById('taskModal');
const modalTitle = document.getElementById('modalTitle');
const taskForm = document.getElementById('taskForm');
const taskIdInput = document.getElementById('taskId');
const taskTitleInput = document.getElementById('taskTitleInput');
const taskDescInput = document.getElementById('taskDescInput');
const taskPriorityInput = document.getElementById('taskPriorityInput');
const taskCategoryInput = document.getElementById('taskCategoryInput');
const taskDueDateInput = document.getElementById('taskDueDateInput');
const taskTagsInput = document.getElementById('taskTagsInput');
const openNewTaskModalBtn = document.getElementById('openNewTaskModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const toastContainer = document.getElementById('toastContainer');

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initIcons();
    setupEventListeners();
    checkCloudStatus();
    loadTodos();
});

function initIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Modal events
    openNewTaskModalBtn.addEventListener('click', () => openModal());
    emptyActionBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);
    taskModal.addEventListener('click', (e) => {
        if (e.target === taskModal) closeModal();
    });

    // Form submission
    taskForm.addEventListener('submit', handleTaskFormSubmit);

    // Filter events
    statusTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            statusTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeStatusFilter = tab.dataset.status;
            renderTasks();
        });
    });

    categoryFilter.addEventListener('change', (e) => {
        activeCategoryFilter = e.target.value;
        renderTasks();
    });

    priorityFilter.addEventListener('change', (e) => {
        activePriorityFilter = e.target.value;
        renderTasks();
    });

    // Search events
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        if (searchQuery) {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
        }
        renderTasks();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.classList.add('hidden');
        renderTasks();
    });

    // Clear completed
    clearCompletedBtn.addEventListener('click', handleClearCompleted);

    // Force sync button
    refreshSyncBtn.addEventListener('click', handleForceSync);
}

// Toast Notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle-2';
    if (type === 'error') iconName = 'alert-triangle';

    toast.innerHTML = `
        <i data-lucide="${iconName}" style="width: 18px; height: 18px; flex-shrink: 0;"></i>
        <span>${escapeHtml(message)}</span>
    `;
    
    toastContainer.appendChild(toast);
    initIcons();

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// API Calls
async function checkCloudStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        
        if (data.supabase_connected) {
            cloudStatusBadge.className = 'cloud-status-badge status-connected';
            cloudStatusText.textContent = `Supabase: ${data.bucket} (Persistent)`;
        } else {
            cloudStatusBadge.className = 'cloud-status-badge status-error';
            cloudStatusText.textContent = 'Supabase Disconnected (Cache Mode)';
        }

        if (data.last_sync) {
            updateLastSyncLabel(data.last_sync);
        }
    } catch (err) {
        cloudStatusBadge.className = 'cloud-status-badge status-error';
        cloudStatusText.textContent = 'Server Offline';
    }
}

async function loadTodos(force = false) {
    tasksLoading.classList.remove('hidden');
    tasksEmpty.classList.add('hidden');

    try {
        const res = await fetch(`/api/todos?force=${force}`);
        const result = await res.json();
        
        if (result.success) {
            todos = result.data || [];
            updateStats();
            renderTasks();
            if (result.last_sync) {
                updateLastSyncLabel(result.last_sync);
            }
        } else {
            showToast(result.error || 'Failed to load tasks', 'error');
        }
    } catch (err) {
        showToast('Error connecting to backend API', 'error');
        console.error(err);
    } finally {
        tasksLoading.classList.add('hidden');
    }
}

async function handleForceSync() {
    refreshSyncBtn.classList.add('spin-animation');
    showToast('Syncing with Supabase Storage bucket...', 'info');
    
    try {
        const res = await fetch('/api/sync', { method: 'POST' });
        const result = await res.json();
        if (result.success) {
            showToast('Synchronized with Supabase bucket!', 'success');
            await loadTodos();
            await checkCloudStatus();
        } else {
            showToast(result.error || 'Sync failed', 'error');
        }
    } catch (err) {
        showToast('Sync failed: ' + err.message, 'error');
    } finally {
        refreshSyncBtn.classList.remove('spin-animation');
    }
}

// Render Tasks
function renderTasks() {
    // Filter todos
    let filtered = todos.filter(todo => {
        // Status filter
        if (activeStatusFilter === 'active' && todo.completed) return false;
        if (activeStatusFilter === 'completed' && !todo.completed) return false;

        // Category filter
        if (activeCategoryFilter !== 'All' && todo.category !== activeCategoryFilter) return false;

        // Priority filter
        if (activePriorityFilter !== 'All' && todo.priority !== activePriorityFilter) return false;

        // Search query
        if (searchQuery) {
            const inTitle = (todo.title || '').toLowerCase().includes(searchQuery);
            const inDesc = (todo.description || '').toLowerCase().includes(searchQuery);
            const inTags = (todo.tags || []).some(t => t.toLowerCase().includes(searchQuery));
            if (!inTitle && !inDesc && !inTags) return false;
        }

        return true;
    });

    taskList.innerHTML = '';

    if (filtered.length === 0) {
        tasksEmpty.classList.remove('hidden');
        if (searchQuery || activeCategoryFilter !== 'All' || activePriorityFilter !== 'All' || activeStatusFilter !== 'all') {
            emptyTitle.textContent = 'No matching tasks found';
            emptySubtitle.textContent = 'Try adjusting your filters or search keywords.';
        } else {
            emptyTitle.textContent = 'No tasks yet';
            emptySubtitle.textContent = 'Stay organized! Click the button below to add your first task.';
        }
    } else {
        tasksEmpty.classList.add('hidden');
        filtered.forEach(todo => {
            const itemEl = createTaskElement(todo);
            taskList.appendChild(itemEl);
        });
    }

    initIcons();
}

function createTaskElement(todo) {
    const li = document.createElement('li');
    li.className = `task-item ${todo.completed ? 'completed' : ''}`;
    li.dataset.id = todo.id;

    // Priority class
    const priority = todo.priority || 'Medium';
    const priorityClass = `badge-${priority.toLowerCase()}`;

    // Overdue check
    let dueDateHtml = '';
    if (todo.due_date) {
        const isOverdue = !todo.completed && new Date(todo.due_date) < new Date().setHours(0, 0, 0, 0);
        dueDateHtml = `
            <span class="badge-date ${isOverdue ? 'overdue' : ''}">
                <i data-lucide="calendar" style="width: 12px; height: 12px;"></i>
                <span>${formatDate(todo.due_date)}</span>
                ${isOverdue ? '(Overdue)' : ''}
            </span>
        `;
    }

    // Tags
    let tagsHtml = '';
    if (todo.tags && todo.tags.length > 0) {
        tagsHtml = todo.tags.map(tag => `<span class="tag-pill">#${escapeHtml(tag)}</span>`).join('');
    }

    li.innerHTML = `
        <div class="task-checkbox-wrapper">
            <div class="custom-checkbox" role="checkbox" aria-checked="${todo.completed}" title="${todo.completed ? 'Mark incomplete' : 'Mark complete'}">
                <i data-lucide="check" class="checkbox-check"></i>
            </div>
        </div>
        <div class="task-body">
            <div class="task-header-row">
                <span class="task-title">${escapeHtml(todo.title)}</span>
            </div>
            ${todo.description ? `<p class="task-desc">${escapeHtml(todo.description)}</p>` : ''}
            <div class="task-meta">
                <span class="badge ${priorityClass}">
                    <i data-lucide="flag" style="width: 11px; height: 11px;"></i>
                    ${escapeHtml(priority)}
                </span>
                <span class="badge badge-category">
                    <i data-lucide="tag" style="width: 11px; height: 11px;"></i>
                    ${escapeHtml(todo.category || 'General')}
                </span>
                ${dueDateHtml}
                ${tagsHtml}
            </div>
        </div>
        <div class="task-actions">
            <button class="action-btn edit-btn" title="Edit task">
                <i data-lucide="edit-3"></i>
            </button>
            <button class="action-btn delete-btn" title="Delete task">
                <i data-lucide="trash-2"></i>
            </button>
        </div>
    `;

    // Toggle complete
    const checkbox = li.querySelector('.custom-checkbox');
    checkbox.addEventListener('click', () => toggleTodoComplete(todo.id, !todo.completed));

    // Edit button
    const editBtn = li.querySelector('.edit-btn');
    editBtn.addEventListener('click', () => openModal(todo));

    // Delete button
    const deleteBtn = li.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

    return li;
}

// Update Statistics Cards
function updateStats() {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    totalTasksCount.textContent = total;
    pendingTasksCount.textContent = pending;
    completedTasksCount.textContent = completed;
    progressPercent.textContent = `${percentage}%`;
    progressBarFill.style.width = `${percentage}%`;
}

// Modal Handlers
function openModal(todoToEdit = null) {
    if (todoToEdit) {
        editingTaskId = todoToEdit.id;
        modalTitle.textContent = 'Edit Task';
        taskIdInput.value = todoToEdit.id;
        taskTitleInput.value = todoToEdit.title || '';
        taskDescInput.value = todoToEdit.description || '';
        taskPriorityInput.value = todoToEdit.priority || 'Medium';
        taskCategoryInput.value = todoToEdit.category || 'General';
        taskDueDateInput.value = todoToEdit.due_date || '';
        taskTagsInput.value = (todoToEdit.tags || []).join(', ');
    } else {
        editingTaskId = null;
        modalTitle.textContent = 'Create New Task';
        taskForm.reset();
        taskIdInput.value = '';
        taskPriorityInput.value = 'Medium';
        taskCategoryInput.value = 'General';
    }

    taskModal.classList.remove('hidden');
    taskTitleInput.focus();
    initIcons();
}

function closeModal() {
    taskModal.classList.add('hidden');
    taskForm.reset();
    editingTaskId = null;
}

// Form Submit Handler
async function handleTaskFormSubmit(e) {
    e.preventDefault();
    const title = taskTitleInput.value.trim();
    if (!title) return;

    const tags = taskTagsInput.value
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

    const payload = {
        title: title,
        description: taskDescInput.value.trim(),
        priority: taskPriorityInput.value,
        category: taskCategoryInput.value,
        due_date: taskDueDateInput.value,
        tags: tags
    };

    closeModal();

    try {
        if (editingTaskId) {
            // Update
            const res = await fetch(`/api/todos/${editingTaskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                showToast('Task updated and saved to Supabase bucket!', 'success');
                await loadTodos();
            } else {
                showToast(result.error || 'Failed to update task', 'error');
            }
        } else {
            // Create
            const res = await fetch('/api/todos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                showToast('Task created and saved to Supabase bucket!', 'success');
                await loadTodos();
            } else {
                showToast(result.error || 'Failed to create task', 'error');
            }
        }
    } catch (err) {
        showToast('Network error while saving task', 'error');
    }
}

// Toggle Complete
async function toggleTodoComplete(id, completed) {
    // Optimistic update
    const target = todos.find(t => t.id === id);
    if (target) {
        target.completed = completed;
        updateStats();
        renderTasks();
    }

    try {
        const res = await fetch(`/api/todos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed })
        });
        const result = await res.json();
        if (result.success) {
            showToast(completed ? 'Task completed! Synced to cloud.' : 'Task marked active. Synced to cloud.', 'success');
            await loadTodos();
        } else {
            showToast(result.error || 'Failed to update status', 'error');
            await loadTodos();
        }
    } catch (err) {
        showToast('Network error updating task', 'error');
        await loadTodos();
    }
}

// Delete Todo
async function deleteTodo(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    // Optimistic delete
    todos = todos.filter(t => t.id !== id);
    updateStats();
    renderTasks();

    try {
        const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (result.success) {
            showToast('Task deleted from Supabase bucket', 'info');
            await loadTodos();
        } else {
            showToast(result.error || 'Failed to delete task', 'error');
            await loadTodos();
        }
    } catch (err) {
        showToast('Network error deleting task', 'error');
        await loadTodos();
    }
}

// Clear Completed
async function handleClearCompleted() {
    const completedCount = todos.filter(t => t.completed).length;
    if (completedCount === 0) {
        showToast('No completed tasks to clear', 'info');
        return;
    }

    if (!confirm(`Clear ${completedCount} completed task(s)?`)) return;

    try {
        const res = await fetch('/api/todos/bulk-clear', { method: 'POST' });
        const result = await res.json();
        if (result.success) {
            showToast(`Cleared ${result.cleared_count} completed tasks from Supabase bucket!`, 'success');
            await loadTodos();
        } else {
            showToast(result.error || 'Failed to clear completed tasks', 'error');
        }
    } catch (err) {
        showToast('Network error clearing completed tasks', 'error');
    }
}

// Utility Functions
function updateLastSyncLabel(isoString) {
    try {
        const d = new Date(isoString);
        lastSyncLabel.textContent = `Last synced: ${d.toLocaleTimeString()}`;
    } catch (e) {
        lastSyncLabel.textContent = `Last synced: Just now`;
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const [year, month, day] = dateStr.split('-');
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
