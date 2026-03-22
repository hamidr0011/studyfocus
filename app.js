// --- Apple HIG Helpers ---
function playApplePing() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  if(!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
}

function playAppleClick() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  if(!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = 'square'; osc.frequency.setValueAtTime(150, ctx.currentTime);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.05);
}

function appleHaptic(type = 'light') {
  if (navigator.vibrate) {
    if (type === 'light') navigator.vibrate(10);
    if (type === 'heavy') navigator.vibrate(20);
    if (type === 'success') navigator.vibrate([10, 50, 15]);
  }
}

function sendWebNotification(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(p => { if (p === "granted") new Notification(title, { body }); });
  }
}

if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}

// --- Theme Handling ---
const themeSwitchBtn = document.getElementById('themeSwitchBtn');
const savedTheme = localStorage.getItem('sf_theme') || 'light';
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark-mode');
}

themeSwitchBtn.addEventListener('click', () => {
  appleHaptic('light'); // tactile feel on switch
  document.documentElement.classList.toggle('dark-mode');
  const isDark = document.documentElement.classList.contains('dark-mode');
  localStorage.setItem('sf_theme', isDark ? 'dark' : 'light');
  if(typeof window.applyTint === 'function') window.applyTint(localStorage.getItem('sf_tint') || 'blue');
  if(typeof window.updateChart === 'function') window.updateChart();
});

// --- Tint Handling ---
const tintBtns = document.querySelectorAll('.tint-btn');
const savedTint = localStorage.getItem('sf_tint') || 'blue';

window.applyTint = function(tint) {
  tintBtns.forEach(b => b.classList.remove('active'));
  const activeBtn = Array.from(tintBtns).find(b => b.dataset.tint === tint);
  if(activeBtn) activeBtn.classList.add('active');
  
  if(tint === 'blue') {
    document.documentElement.style.setProperty('--app-tint', 'var(--system-blue)');
    document.documentElement.style.setProperty('--app-tint-alpha', document.documentElement.classList.contains('dark-mode') ? 'rgba(10, 132, 255, 0.35)' : 'rgba(0, 122, 255, 0.25)');
  }
  if(tint === 'purple') {
    document.documentElement.style.setProperty('--app-tint', 'var(--system-indigo)');
    document.documentElement.style.setProperty('--app-tint-alpha', document.documentElement.classList.contains('dark-mode') ? 'rgba(94, 92, 230, 0.35)' : 'rgba(88, 86, 214, 0.25)');
  }
  if(tint === 'pink') {
    document.documentElement.style.setProperty('--app-tint', 'var(--system-pink)');
    document.documentElement.style.setProperty('--app-tint-alpha', document.documentElement.classList.contains('dark-mode') ? 'rgba(255, 55, 95, 0.35)' : 'rgba(255, 45, 85, 0.25)');
  }
  localStorage.setItem('sf_tint', tint);
  if(typeof window.updateChart === 'function') window.updateChart();
};

window.applyTint(savedTint);

tintBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    appleHaptic('light');
    window.applyTint(e.target.dataset.tint);
  });
});

// --- Data Schema ---
const DATA_KEYS = {
  SUBJECTS: 'sf_subjects',
  TASKS: 'sf_tasks',
  SESSIONS: 'sf_sessions',
  GOAL: 'sf_goal',
  STREAK: 'sf_streak'
};

const SUBJECT_COLORS = [
  'var(--system-red)', 'var(--system-orange)', 'var(--system-yellow)', 'var(--system-green)', 
  'var(--system-teal)', 'var(--system-blue)', 'var(--system-indigo)', 'var(--system-pink)'
];

// Default Data
let subjects = [];
let tasks = [];
let sessions = [];
let dailyGoal = 120; // Default 120 mins
let streakData = { count: 0, lastStudyDate: null };

// App State
let activeSubjectIdForTask = null;
let deleteSubjectId = null;
let deleteTaskObj = null;

// Timer State
let timerInterval;
let timerSeconds = 0;
let isTimerRunning = false;
let isTimerPaused = false;
let activeSubjectIdForTimer = null;

// Chart Instance
let analyticsChart = null;

// --- Initialize App ---
function initApp() {
  loadData();
  checkAndUpdateStreak();
  setupNavigation();
  setupModals();
  setupTimer();
  populateColorPicker();
  renderSubjects();
  renderDashboardTasks();
  renderGlobalTasks();
  renderAnalytics();
  updateGoalProgress();
  updateStreakDisplay();
}

// --- Data Loading & Saving ---
function loadData() {
  try {
    subjects = JSON.parse(localStorage.getItem(DATA_KEYS.SUBJECTS)) || [];
    tasks = JSON.parse(localStorage.getItem(DATA_KEYS.TASKS)) || [];
    sessions = JSON.parse(localStorage.getItem(DATA_KEYS.SESSIONS)) || [];
    
    const savedGoal = localStorage.getItem(DATA_KEYS.GOAL);
    if (savedGoal) dailyGoal = parseInt(savedGoal);
    
    streakData = JSON.parse(localStorage.getItem(DATA_KEYS.STREAK)) || { count: 0, lastStudyDate: null };
  } catch (e) {
    showToast('Failed to load data from LocalStorage', 'error');
  }
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// --- Utility Functions ---
function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// --- Navigation ---
function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const pages = document.querySelectorAll('.page');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      // Remove active from all
      navLinks.forEach(n => n.classList.remove('active'));
      pages.forEach(p => p.classList.remove('active'));
      
      // Add active to clicked
      link.classList.add('active');
      const targetId = link.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');
      
      if(targetId === 'analytics') renderAnalytics(); // re-render charts when showing
    });
  });
}

// --- Toast Notifications ---
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

// --- Modals Logic ---
function setupModals() {
  const closeBtns = document.querySelectorAll('.closeModalBtn');
  closeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.modal-overlay').classList.remove('active');
    });
  });
  
  document.getElementById('editGoalBtn').addEventListener('click', () => {
    document.getElementById('goalMinutesInput').value = dailyGoal;
    openModal('editGoalModal');
  });
  
  document.getElementById('confirmGoalBtn').addEventListener('click', () => {
    const min = parseInt(document.getElementById('goalMinutesInput').value);
    if(min > 0) {
      dailyGoal = min;
      localStorage.setItem(DATA_KEYS.GOAL, dailyGoal);
      updateGoalProgress();
      closeModal('editGoalModal');
      showToast('Goal updated');
    }
  });

  // Keep modal close empty on Escape and overlay click
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if(e.target === modal) closeModal(modal.id);
    });
  });

  document.addEventListener('keydown', (e) => {
    const isEditing = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT';
    
    // Escape to close modals
    if(e.key === 'Escape') {
      const activeModal = document.querySelector('.modal-overlay.active');
      if(activeModal) closeModal(activeModal.id);
    }

    // Space to start/pause timer
    if(e.code === 'Space' && !isEditing) {
      const activeModal = document.querySelector('.modal-overlay.active');
      if(!activeModal) {
        e.preventDefault();
        const startBtn = document.getElementById('btnTimerStart');
        const pauseBtn = document.getElementById('btnTimerPause');
        
        if(window.getComputedStyle(startBtn).display !== 'none' && !startBtn.disabled) startTimer();
        else if(window.getComputedStyle(pauseBtn).display !== 'none' && !pauseBtn.disabled) pauseTimer();
      }
    }

    // N for new task
    if(e.key.toLowerCase() === 'n' && !isEditing) {
      const activeModal = document.querySelector('.modal-overlay.active');
      if(!activeModal) {
        e.preventDefault();
        openAddTaskModal();
      }
    }
  });
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
  
  // Focus first input if exists
  const firstInput = document.getElementById(modalId).querySelector('input');
  if(firstInput) setTimeout(() => firstInput.focus(), 100);
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// --- Subjects Management ---
function populateColorPicker() {
  const container = document.getElementById('subjectColorPicker');
  SUBJECT_COLORS.forEach((color, index) => {
    const btn = document.createElement('button');
    btn.className = 'color-option';
    btn.style.backgroundColor = color;
    btn.setAttribute('aria-label', `Color ${color}`);
    btn.dataset.color = color;
    if(index === 0) btn.classList.add('selected'); // Default selection
    
    btn.addEventListener('click', () => {
      container.querySelectorAll('.color-option').forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
    });
    
    container.appendChild(btn);
  });
}

let editSubjectId = null;

window.openEditSubjectModal = function(id) {
  const sub = subjects.find(s => s.id === id);
  if(!sub) return;
  editSubjectId = id;
  
  document.getElementById('subjectNameInput').value = sub.name;
  document.getElementById('subjectNameError').style.display = 'none';
  document.getElementById('addSubjectTitle').textContent = 'Edit List';
  document.getElementById('confirmAddSubjectBtn').textContent = 'Save Changes';
  
  const colorBtns = document.getElementById('subjectColorPicker').querySelectorAll('.color-option');
  colorBtns.forEach(c => c.classList.remove('selected'));
  const targetBtn = Array.from(colorBtns).find(c => c.dataset.color === sub.color);
  if(targetBtn) targetBtn.classList.add('selected');
  
  openModal('addSubjectModal');
};

document.getElementById('btnAddSubject').addEventListener('click', () => {
  editSubjectId = null;
  document.getElementById('subjectNameInput').value = '';
  document.getElementById('subjectNameError').style.display = 'none';
  document.getElementById('addSubjectTitle').textContent = 'Add Subject';
  document.getElementById('confirmAddSubjectBtn').textContent = 'Add Subject';
  
  // Random color selection for Apple "Sequencing" paradigm
  const randIndex = Math.floor(Math.random() * SUBJECT_COLORS.length);
  const colorBtns = document.getElementById('subjectColorPicker').querySelectorAll('.color-option');
  colorBtns.forEach(c => c.classList.remove('selected'));
  if(colorBtns[randIndex]) colorBtns[randIndex].classList.add('selected');
  
  openModal('addSubjectModal');
});

document.getElementById('confirmAddSubjectBtn').addEventListener('click', () => {
  const nameInput = document.getElementById('subjectNameInput');
  const name = nameInput.value.trim();
  const colorNode = document.querySelector('#subjectColorPicker .selected');
  const color = colorNode ? colorNode.dataset.color : SUBJECT_COLORS[0];
  
  if (!name) {
    document.getElementById('subjectNameError').style.display = 'block';
    return;
  }
  
  if(editSubjectId) {
    const sub = subjects.find(s => s.id === editSubjectId);
    if(sub) {
      sub.name = name;
      sub.color = color;
    }
    saveData(DATA_KEYS.SUBJECTS, subjects);
    showToast(`List updated`);
  } else {
    const newSub = { id: generateId(), name, color, notes: '' };
    subjects.push(newSub);
    saveData(DATA_KEYS.SUBJECTS, subjects);
    showToast(`Subject "${name}" added`);
  }
  
  appleHaptic('success');
  renderSubjects();
  updateTimerSubjectDropdown();
  closeModal('addSubjectModal');
});

document.getElementById('confirmDeleteSubjectBtn').addEventListener('click', () => {
  if(!deleteSubjectId) return;
  
  // Remove subject
  const subjectName = subjects.find(s => s.id === deleteSubjectId)?.name || 'Subject';
  subjects = subjects.filter(s => s.id !== deleteSubjectId);
  saveData(DATA_KEYS.SUBJECTS, subjects);
  
  // Remove associated tasks
  tasks = tasks.filter(t => t.subjectId !== deleteSubjectId);
  saveData(DATA_KEYS.TASKS, tasks);
  
  // Update UI
  renderSubjects();
  renderDashboardTasks();
  updateTimerSubjectDropdown();
  closeModal('deleteSubjectModal');
  showToast(`${subjectName} deleted`);
  deleteSubjectId = null;
});

let notesDebounceTimer;
function saveNotes(subjectId, text) {
  clearTimeout(notesDebounceTimer);
  notesDebounceTimer = setTimeout(() => {
    const sub = subjects.find(s => s.id === subjectId);
    if(sub) {
      sub.notes = text;
      saveData(DATA_KEYS.SUBJECTS, subjects);
      // Don't show toast for notes to avoid spam
    }
  }, 1000);
}

function renderSubjects() {
  const grid = document.getElementById('subjectsGrid');
  grid.innerHTML = '';
  
  if (subjects.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1; display:flex; flex-direction:column; align-items:center; gap:15px; margin-top:40px;">
        <p>No lists yet. Add your first subject to get started.</p>
        <button class="btn btn-primary" onclick="document.getElementById('btnAddSubject').click()">Create List</button>
      </div>`;
    return;
  }
  
  subjects.forEach(sub => {
    // Calc stats
    const subTasks = tasks.filter(t => t.subjectId === sub.id);
    const subSessions = sessions.filter(s => s.subjectId === sub.id);
    
    const tasksDoneCount = subTasks.filter(t => t.status === 'done').length;
    const totalMins = subSessions.reduce((sum, s) => sum + s.duration, 0);
    const timeStr = totalMins > 60 ? `${(totalMins/60).toFixed(1)}h` : `${totalMins}m`;
    
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.dataset.id = sub.id; // Crucial for Right-Click context menus
    card.style.setProperty('--subject-color', sub.color);
    
    card.innerHTML = `
      <div class="subject-header">
        <div class="subject-title">
          <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${sub.color}"></span>
          ${sub.name}
        </div>
        <!-- Action buttons removed for Apple Context Menu fluidity -->
      </div>
      <div class="subject-stats">
        <span>${subTasks.length} Tasks</span>
        <span>${timeStr} Total Time</span>
      </div>
      <div class="subject-notes" style="border-bottom: none;">
        <textarea placeholder="Quick notes, formulas, reminders..." aria-label="Notes for ${sub.name}" oninput="saveNotes('${sub.id}', this.value)">${sub.notes || ''}</textarea>
      </div>
    `;
    grid.appendChild(card);
  });
}

window.openDeleteSubjectModal = function(id, name) {
  deleteSubjectId = id;
  document.getElementById('deleteSubjectName').textContent = name;
  openModal('deleteSubjectModal');
};

// --- Task Management ---
window.openAddTaskModal = function(subId = null, subName = null) {
  const select = document.getElementById('taskSubjectSelect');
  select.innerHTML = '<option value="">Select a List...</option>';
  subjects.forEach(sub => {
    select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
  });
  
  if(subId) select.value = subId;
  else select.value = '';

  document.getElementById('taskNameInput').value = '';
  document.getElementById('taskTimeInput').value = '';
  document.getElementById('taskPrioritySelect').value = 'Medium';
  
  document.getElementById('taskNameError').style.display = 'none';
  document.getElementById('taskSubjectError').style.display = 'none';
  
  openModal('addTaskModal');
};

document.getElementById('confirmAddTaskBtn').addEventListener('click', () => {
  const titleInput = document.getElementById('taskNameInput');
  const title = titleInput.value.trim();
  const subjectId = document.getElementById('taskSubjectSelect').value;
  const priority = document.getElementById('taskPrioritySelect').value;
  const estTime = document.getElementById('taskTimeInput').value || 0;
  
  let hasError = false;
  
  if(!subjectId) {
    document.getElementById('taskSubjectError').style.display = 'block';
    hasError = true;
  } else {
    document.getElementById('taskSubjectError').style.display = 'none';
  }
  
  if(!title) {
    document.getElementById('taskNameError').style.display = 'block';
    hasError = true;
  } else {
    document.getElementById('taskNameError').style.display = 'none';
  }
  
  if(hasError) return;
  
  const newTask = {
    id: generateId(),
    subjectId: subjectId,
    title,
    priority,
    estTime: parseInt(estTime),
    status: 'todo'
  };
  
  tasks.push(newTask);
  saveData(DATA_KEYS.TASKS, tasks);
  
  appleHaptic('success');
  renderSubjects();
  renderDashboardTasks();
  renderGlobalTasks();
  closeModal('addTaskModal');
  showToast('Task added');
});

function createTaskHTML(task) {
  const statusCycleNext = task.status === 'todo' ? 'progress' : (task.status === 'progress' ? 'done' : 'todo');
  const statusClass = task.status === 'todo' ? '' : `status-${task.status}`;
  const titleClass = task.status === 'done' ? 'done' : '';
  const estHtml = task.estTime > 0 ? `<span>⏱ ${task.estTime}m</span>` : '';
  const bgClass = task.priority.toLowerCase();
  
  const sub = subjects.find(s => s.id === task.subjectId);
  const subHint = sub ? `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${sub.color}; margin-right:6px;"></span>` : '';
  
  let ariaLabelToggle = `Mark task as ${statusCycleNext}`;
  if(task.status==='done') ariaLabelToggle='Mark task as to do';
  
  let priorityIcon = '';
  if(task.priority === 'High') priorityIcon = '<span aria-hidden="true" style="margin-right:2px; font-weight:800;">!</span> ';
  else if(task.priority === 'Medium') priorityIcon = '<span aria-hidden="true" style="margin-right:2px; font-weight:800;">=</span> ';
  else priorityIcon = '<span aria-hidden="true" style="margin-right:2px; font-weight:800;">↓</span> ';
  
  return `
    <li class="task-item" draggable="true" data-id="${task.id}">
      <div class="task-item-bg-actions">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      </div>
      <div class="task-item-content">
        <div class="task-content">
          <div class="task-title ${titleClass}">${subHint}${task.title}</div>
          <div class="task-meta">
            <span class="badge badge-${bgClass}">${priorityIcon}${task.priority}</span>
            ${estHtml}
          </div>
        </div>
        <div class="task-actions">
          <button class="status-toggle ${statusClass}" aria-label="${ariaLabelToggle}" onclick="cycleTaskStatus('${task.id}')"></button>
          <button class="btn-icon" aria-label="Delete task" onclick="openDeleteTaskModal('${task.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    </li>
  `;
}

window.cycleTaskStatus = function(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if(task) {
    if(task.status === 'todo') task.status = 'progress';
    else if(task.status === 'progress') task.status = 'done';
    else task.status = 'todo';
    
    saveData(DATA_KEYS.TASKS, tasks);
    appleHaptic('light'); playAppleClick();
    renderSubjects();
    renderDashboardTasks();
    renderGlobalTasks();
  }
};

window.openDeleteTaskModal = function(taskId) {
  deleteTaskObj = taskId;
  openModal('deleteTaskModal');
};

let lastDeletedTask = null;
let undoTimeout = null;

window.undoDeleteTask = function() {
  if(lastDeletedTask) {
    tasks.push(lastDeletedTask);
    saveData(DATA_KEYS.TASKS, tasks);
    renderSubjects();
    renderDashboardTasks();
    renderGlobalTasks();
    
    // Remove undo toast immediately
    const toast = document.getElementById('undoToast');
    if(toast) toast.remove();
    
    showToast('Task restored');
    lastDeletedTask = null;
    clearTimeout(undoTimeout);
  }
};

function showUndoToast(message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.id = 'undoToast';
  toast.className = `toast`;
  toast.setAttribute('role', 'status');
  toast.style.display = 'flex';
  toast.style.justifyContent = 'space-between';
  toast.style.alignItems = 'center';
  toast.style.minWidth = '250px';
  toast.innerHTML = `
    <span>${message}</span>
    <button onclick="undoDeleteTask()" aria-label="Undo deletion" style="background:none; border:none; color:var(--primary); font-family:var(--font-body); font-weight:700; cursor:pointer; font-size:0.95rem; margin-left:20px; outline:none;" onfocus="this.style.textDecoration='underline'" onblur="this.style.textDecoration='none'" onmouseenter="this.style.textDecoration='underline'" onmouseleave="this.style.textDecoration='none'">Undo</button>
  `;
  container.appendChild(toast);
  
  clearTimeout(undoTimeout);
  undoTimeout = setTimeout(() => {
    toast.remove();
    lastDeletedTask = null;
  }, 5000); // 5 seconds to undo
}

document.getElementById('confirmDeleteTaskBtn').addEventListener('click', () => {
  if(!deleteTaskObj) return;
  lastDeletedTask = tasks.find(t => t.id === deleteTaskObj);
  tasks = tasks.filter(t => t.id !== deleteTaskObj);
  saveData(DATA_KEYS.TASKS, tasks);
  renderSubjects();
  renderDashboardTasks();
  renderGlobalTasks();
  closeModal('deleteTaskModal');
  
  if(lastDeletedTask) {
    showUndoToast('Task deleted');
  }
  deleteTaskObj = null;
});

function renderDashboardTasks() {
  const list = document.getElementById('dashboardTasksList');
  if(!list) return;
  
  const activeTasks = tasks.filter(t => t.status !== 'done'); // Show non-completed tasks
  
  if(activeTasks.length === 0) {
    list.innerHTML = `
      <li class="empty-state" style="padding:20px 10px; display:flex; flex-direction:column; align-items:center; gap:10px;">
        <span>No active tasks right now.</span>
        <button class="btn btn-secondary" onclick="openAddTaskModal()" style="font-size:0.85rem; padding:6px 14px;">Add Task</button>
      </li>`;
    return;
  }
  
  // Sort by priority (High, Medium, Low)
  const priorityScore = { 'High': 3, 'Medium': 2, 'Low': 1 };
  activeTasks.sort((a,b) => priorityScore[b.priority] - priorityScore[a.priority]);
  
  // Slice to max 5 items for dashboard cleanliness, like Apple widgets
  const widgetTasks = activeTasks.slice(0, 5);
  list.innerHTML = widgetTasks.map(t => createTaskHTML(t)).join('');
}

function renderGlobalTasks() {
  const list = document.getElementById('globalTasksList');
  if(!list) return;
  
  if(tasks.length === 0) {
    list.innerHTML = `<li class="empty-state">No tasks available. Tap 'New' to add one.</li>`;
    return;
  }
  
  const priorityScore = { 'High': 3, 'Medium': 2, 'Low': 1 };
  
  const sortedTasks = [...tasks].sort((a,b) => {
    if(a.status === 'done' && b.status !== 'done') return 1;
    if(a.status !== 'done' && b.status === 'done') return -1;
    return priorityScore[b.priority] - priorityScore[a.priority];
  });
  
  list.innerHTML = sortedTasks.map(t => createTaskHTML(t)).join('');
}

// --- Timer Logic ---
function updateTimerSubjectDropdown() {
  const select = document.getElementById('timerSubjectSelect');
  const currentVal = select.value;
  select.innerHTML = '<option value="">Select a subject...</option>';
  
  subjects.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub.id;
    opt.textContent = sub.name;
    // Add colored hint? Not easily supported in native <option>, but standard dropdown works.
    select.appendChild(opt);
  });
  
  if(currentVal && subjects.find(s => s.id === currentVal)) {
    select.value = currentVal;
  }
  checkTimerStartCapability();
}

function checkTimerStartCapability() {
  const select = document.getElementById('timerSubjectSelect');
  const startBtn = document.getElementById('btnTimerStart');
  
  if(select.value && !isTimerRunning) {
    startBtn.disabled = false;
  } else {
    startBtn.disabled = true;
  }
}

function setupTimer() {
  const select = document.getElementById('timerSubjectSelect');
  select.addEventListener('change', checkTimerStartCapability);
  
  document.getElementById('btnTimerStart').addEventListener('click', startTimer);
  document.getElementById('btnTimerPause').addEventListener('click', pauseTimer);
  document.getElementById('btnTimerStop').addEventListener('click', stopTimer);
  
  updateTimerSubjectDropdown();
}

function startTimer() {
  const select = document.getElementById('timerSubjectSelect');
  activeSubjectIdForTimer = select.value;
  if(!activeSubjectIdForTimer) return; // safety
  
  appleHaptic('light'); playAppleClick();
  
  isTimerRunning = true;
  isTimerPaused = false;
  
  document.getElementById('btnTimerStart').style.display = 'none';
  document.getElementById('btnTimerPause').style.display = 'flex';
  document.getElementById('btnTimerPause').disabled = false;
  document.getElementById('btnTimerStop').disabled = false;
  
  select.disabled = true; // Lock subject while running
  document.getElementById('timerStateText').textContent = 'Running... Focus!';
  
  timerInterval = setInterval(() => {
    timerSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function pauseTimer() {
  if(!isTimerRunning) return;
  
  clearInterval(timerInterval);
  isTimerPaused = true;
  isTimerRunning = false;
  
  document.getElementById('btnTimerStart').style.display = 'flex';
  document.getElementById('btnTimerStart').disabled = false;
  document.getElementById('btnTimerStart').textContent = 'Resume';
  document.getElementById('btnTimerPause').style.display = 'none';
  document.getElementById('timerStateText').textContent = 'Paused';
}

function stopTimer() {
  clearInterval(timerInterval);
  
  appleHaptic('heavy'); playApplePing();
  
  if(timerSeconds > 0) {
    saveSession();
  }
  
  // Reset Timer
  timerSeconds = 0;
  isTimerRunning = false;
  isTimerPaused = false;
  
  document.getElementById('btnTimerStart').style.display = 'flex';
  document.getElementById('btnTimerStart').disabled = true; // disabled after stop
  document.getElementById('btnTimerStart').textContent = 'Start';
  document.getElementById('btnTimerPause').style.display = 'none';
  document.getElementById('btnTimerStop').disabled = true;
  
  document.getElementById('timerSubjectSelect').disabled = false;
  document.getElementById('timerStateText').textContent = 'Stopped';
  
  updateTimerDisplay();
  checkTimerStartCapability();
}

function updateTimerDisplay() {
  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  document.getElementById('timerDisplay').textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}

function saveSession() {
  const mins = Math.floor(timerSeconds / 60);
  // Log sessions that are at least 1 minute (for realism, or maybe round up if it's 30s)
  const duration = mins > 0 ? mins : 1; 
  
  const today = getTodayString();
  const sessionObj = {
    id: generateId(),
    subjectId: activeSubjectIdForTimer,
    duration: duration,
    date: today,
    timestamp: Date.now()
  };
  
  sessions.push(sessionObj);
  saveData(DATA_KEYS.SESSIONS, sessions);
  
  sendWebNotification("Focus Session Complete", `You focused for ${duration} minute(s).`);
  
  updateStreakDisplay();
  updateGoalProgress();
  showToast(`Session saved: ${duration} min`);
}

// --- Daily Goal & Streak ---
function updateGoalProgress() {
  const today = getTodayString();
  const todaySessions = sessions.filter(s => s.date === today);
  const totalMinsToday = todaySessions.reduce((sum, s) => sum + s.duration, 0);
  
  const fill = document.getElementById('goalProgressFill');
  const percent = Math.round((totalMinsToday / dailyGoal) * 100);
  
  if (percent > 100) {
    fill.style.width = '100%';
    fill.style.backgroundImage = 'linear-gradient(90deg, #A4FF2A, #34C759, #A4FF2A)';
    fill.style.backgroundSize = '200% auto';
    if(!document.getElementById('appleGlowStyle')) {
      const style = document.createElement('style');
      style.id = 'appleGlowStyle';
      style.textContent = `@keyframes glowLap { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }`;
      document.head.appendChild(style);
    }
    fill.style.animation = 'glowLap 2s linear infinite';
    document.getElementById('goalProgressBar').style.boxShadow = '0 0 10px rgba(52, 199, 89, 0.5)';
  } else {
    fill.style.width = `${percent}%`;
    fill.style.backgroundImage = 'linear-gradient(90deg, #A4FF2A, #65C600)';
    fill.style.animation = 'none';
    document.getElementById('goalProgressBar').style.boxShadow = 'none';
  }
  
  document.getElementById('goalProgressText').textContent = `${totalMinsToday} mins / ${dailyGoal} min goal`;
}

function checkAndUpdateStreak() {
  const todayStr = getTodayString();
  const yesterdayStr = getYesterdayString();
  
  const lastStudy = streakData.lastStudyDate;
  
  if (lastStudy === todayStr) {
    // Already studied today, keep streak
  } else if (lastStudy === yesterdayStr) {
    // We studied yesterday, we haven't logged today yet, but we shouldn't lose it UNTIL tomorrow
  } else if (lastStudy) {
    // Missed a day
    streakData.count = 0;
  }
  
  saveData(DATA_KEYS.STREAK, streakData);
}

function logStudyDay() {
  const todayStr = getTodayString();
  const yesterdayStr = getYesterdayString();
  const lastStudy = streakData.lastStudyDate;
  
  if (lastStudy !== todayStr) {
    if (lastStudy === yesterdayStr || !lastStudy || streakData.count === 0) {
      streakData.count++;
    }
    streakData.lastStudyDate = todayStr;
    saveData(DATA_KEYS.STREAK, streakData);
  }
}

function updateStreakDisplay() {
  // If we had sessions today, verify streak is incremented
  const todayStr = getTodayString();
  const hasSessionsToday = sessions.some(s => s.date === todayStr);
  
  if(hasSessionsToday) {
    logStudyDay();
  } else {
    checkAndUpdateStreak();
  }
  
  document.getElementById('streakCount').textContent = streakData.count;
}


// --- Analytics & Charts ---
function renderAnalytics() {
  // 1. Calculate Summary Stats (This Week)
  // For simplicity, defining "this week" as last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentSessions = sessions.filter(s => new Date(s.timestamp) > sevenDaysAgo);
  const totalMins = recentSessions.reduce((sum, s) => sum + s.duration, 0);
  
  document.getElementById('statTotalHours').textContent = totalMins > 60 ? `${(totalMins/60).toFixed(1)}h` : `${totalMins}m`;
  
  document.getElementById('statTasksDone').textContent = tasks.filter(t => t.status === 'done').length;
  
  // Most studied
  const subMap = {};
  recentSessions.forEach(s => {
    subMap[s.subjectId] = (subMap[s.subjectId] || 0) + s.duration;
  });
  
  let mostStudiedId = null;
  let maxTime = 0;
  for(let id in subMap) {
    if(subMap[id] > maxTime) { maxTime = subMap[id]; mostStudiedId = id; }
  }
  const mostStudiedSub = subjects.find(s => s.id === mostStudiedId);
  document.getElementById('statMostStudied').textContent = mostStudiedSub ? mostStudiedSub.name : '-';
  
  // 2. Render Chart
  renderChart();
  
  // 3. Render Session History Table
  renderHistoryTable();
}

function renderChart() {
  const ctx = document.getElementById('analyticsChart');
  const emptyState = document.getElementById('chartEmptyState');
  
  if (sessions.length === 0 || subjects.length === 0) {
    if(analyticsChart) { analyticsChart.destroy(); analyticsChart = null; }
    ctx.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }
  
  ctx.style.display = 'block';
  emptyState.style.display = 'none';
  
  // Group by Subject
  const dataMap = {};
  subjects.forEach(s => dataMap[s.id] = 0);
  
  sessions.forEach(s => {
    if(dataMap[s.subjectId] !== undefined) {
      dataMap[s.subjectId] += s.duration;
    }
  });
  
  const labels = [];
  const data = [];
  const bgColors = [];
  
  subjects.forEach(s => {
    labels.push(s.name);
    data.push(dataMap[s.id]);
    bgColors.push(s.color);
  });
  
  if(analyticsChart) {
    analyticsChart.data.labels = labels;
    analyticsChart.data.datasets[0].data = data;
    analyticsChart.data.datasets[0].backgroundColor = bgColors;
    analyticsChart.update();
  } else {
    analyticsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Study Time (minutes)',
          data: data,
          backgroundColor: bgColors,
          borderWidth: 0,
          borderRadius: 8,
          barPercentage: 0.6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#000000',
            bodyColor: '#8E8E93',
            titleFont: { family: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif", size: 14, weight: 'bold' },
            bodyFont: { family: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif", size: 13 },
            padding: 12,
            cornerRadius: 14,
            displayColors: false,
            borderColor: 'rgba(0,0,0,0.05)',
            borderWidth: 1
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            border: { display: false },
            grid: {
              color: 'rgba(0,0,0,0.04)',
              drawTicks: false
            },
            ticks: {
              color: '#8E8E93',
              padding: 10,
              font: { family: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }
            }
          },
          x: {
            border: { display: false },
            grid: {
              display: false,
              drawTicks: false
            },
            ticks: {
              color: '#8E8E93',
              padding: 10,
              font: { family: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif", weight: '500' }
            }
          }
        }
      }
    });
  }
}

function renderHistoryTable() {
  const tbody = document.getElementById('historyTableBody');
  if(sessions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state" style="padding:20px;">No sessions recorded yet.</td></tr>';
    return;
  }
  
  // Sort descending by timestamp
  const sortedSessions = [...sessions].sort((a,b) => b.timestamp - a.timestamp).slice(0, 15); // Show last 15
  
  tbody.innerHTML = sortedSessions.map(s => {
    const sub = subjects.find(sb => sb.id === s.subjectId);
    const subName = sub ? sub.name : 'Unknown Subject';
    const subColor = sub ? sub.color : '#666';
    
    return `
      <tr>
        <td>${s.date}</td>
        <td>
          <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background-color:${subColor}; margin-right:5px;"></span>
          ${subName}
        </td>
        <td>${s.duration} min</td>
      </tr>
    `;
  }).join('');
}

// --- Spotlight Search (Cmd+K) ---
const spotlightOverlay = document.getElementById('spotlightOverlay');
const spotlightInput = document.getElementById('spotlightInput');
const spotlightResults = document.getElementById('spotlightResults');

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    spotlightOverlay.classList.add('active');
    setTimeout(() => spotlightInput.focus(), 100);
    spotlightInput.value = '';
    renderSpotlightResults('');
  }
  if (e.key === 'Escape' && spotlightOverlay.classList.contains('active')) {
    spotlightOverlay.classList.remove('active');
  }
});

spotlightOverlay.addEventListener('click', (e) => {
  if (e.target === spotlightOverlay) spotlightOverlay.classList.remove('active');
});

spotlightInput.addEventListener('input', (e) => {
  renderSpotlightResults(e.target.value.toLowerCase());
});

function renderSpotlightResults(query) {
  spotlightResults.innerHTML = '';
  if (!query) return;
  
  const matches = tasks.filter(t => t.title.toLowerCase().includes(query) || (t.priority && t.priority.toLowerCase().includes(query)));
  
  if (matches.length === 0) {
    spotlightResults.innerHTML = `<li style="padding:15px 20px; color:var(--text-muted);">No tasks found.</li>`;
    return;
  }
  
  matches.forEach(task => {
    const sub = subjects.find(s => s.id === task.subjectId);
    const subName = sub ? sub.name : 'Unknown';
    const li = document.createElement('li');
    li.className = 'spotlight-result-item';
    li.innerHTML = `
      <div>
        <div class="sr-title">${task.title}</div>
        <div class="sr-subtitle">${subName} • ${task.priority} Priority</div>
      </div>
      <div style="display:flex; align-items:center;">
        <span class="badge badge-${task.priority.toLowerCase()}">${task.status === 'done' ? 'Done' : 'Active'}</span>
      </div>
    `;
    li.addEventListener('click', () => {
      spotlightOverlay.classList.remove('active');
      appleHaptic('light');
      document.querySelector('[data-target="tasks"]').click(); // Jump to tasks tab
    });
    spotlightResults.appendChild(li);
  });
}

// --- Context Menu ---
const ctxMenu = document.getElementById('appleContextMenu');
let contextTargetSubjectId = null;

document.addEventListener('contextmenu', (e) => {
  const subjectCard = e.target.closest('.subject-card');
  if (subjectCard && e.target.closest('#subjectsGrid')) { 
    e.preventDefault(); 
    contextTargetSubjectId = subjectCard.dataset.id; 
    
    ctxMenu.style.left = `${e.clientX}px`;
    ctxMenu.style.top = `${e.clientY}px`;
    ctxMenu.classList.add('active');
    appleHaptic('medium');
  } else {
    ctxMenu.classList.remove('active');
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.apple-context-menu')) {
    ctxMenu.classList.remove('active');
  }
});

document.getElementById('ctxEditBtn').addEventListener('click', () => {
  if(contextTargetSubjectId) openEditSubjectModal(contextTargetSubjectId);
  ctxMenu.classList.remove('active');
});

document.getElementById('ctxDeleteBtn').addEventListener('click', () => {
  if(contextTargetSubjectId) {
    const sub = subjects.find(s => s.id === contextTargetSubjectId);
    if(sub) openDeleteSubjectModal(sub.id, sub.name.replace(/'/g, "\\'"));
  }
  ctxMenu.classList.remove('active');
});

// --- Drag & Drop (Delegated) ---
let draggedTaskId = null;

document.addEventListener('dragstart', (e) => {
  const tItem = e.target.closest('.task-item');
  if(tItem) {
    draggedTaskId = tItem.dataset.id;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { tItem.style.opacity = '0.5'; }, 0);
  }
});
document.addEventListener('dragover', (e) => {
  const tItem = e.target.closest('.task-item');
  if(tItem && tItem.dataset.id !== draggedTaskId) {
    e.preventDefault();
    tItem.classList.add('drag-over');
  }
});
document.addEventListener('dragleave', (e) => {
  const tItem = e.target.closest('.task-item');
  if(tItem) tItem.classList.remove('drag-over');
});
document.addEventListener('drop', (e) => {
  const targetItem = e.target.closest('.task-item');
  if(targetItem && draggedTaskId && targetItem.dataset.id !== draggedTaskId) {
    e.preventDefault();
    const fromIndex = tasks.findIndex(t => t.id === draggedTaskId);
    const toIndex = tasks.findIndex(t => t.id === targetItem.dataset.id);
    if(fromIndex > -1 && toIndex > -1) {
      const [movedTask] = tasks.splice(fromIndex, 1);
      tasks.splice(toIndex, 0, movedTask);
      saveData(DATA_KEYS.TASKS, tasks);
      appleHaptic('medium');
      renderDashboardTasks();
      renderGlobalTasks();
    }
  }
  document.querySelectorAll('.task-item').forEach(i => {
    i.classList.remove('drag-over');
    i.style.opacity = '1';
  });
  draggedTaskId = null;
});

// --- Touch Swipe-to-Delete ---
let touchStartX = 0;
let swipeItemId = null;

document.addEventListener('touchstart', (e) => {
  const content = e.target.closest('.task-item-content');
  if(content) {
    touchStartX = e.changedTouches[0].screenX;
    swipeItemId = content.closest('.task-item').dataset.id;
    content.style.transition = 'none';
  }
}, {passive: true});

document.addEventListener('touchmove', (e) => {
  if(!swipeItemId) return;
  const content = e.target.closest('.task-item-content');
  if(!content) return;
  
  const currentX = e.changedTouches[0].screenX;
  const diffX = currentX - touchStartX;
  
  if(diffX < 0 && diffX > -100) { 
    content.style.transform = `translateX(${diffX}px)`;
  } else if (diffX <= -100 && content.style.transform !== `translateX(-100px)`) {
    content.style.transform = `translateX(-100px)`;
    appleHaptic('light'); 
  }
}, {passive: true});

document.addEventListener('touchend', (e) => {
  if(!swipeItemId) return;
  const content = e.target.closest('.task-item-content');
  if(!content) { swipeItemId = null; return; }
  
  const currentX = e.changedTouches[0].screenX;
  const diffX = currentX - touchStartX;
  
  content.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)';
  
  if(diffX <= -80) { 
    content.style.transform = `translateX(-80px)`;
    const li = content.closest('.task-item');
    const bg = li.querySelector('.task-item-bg-actions');
    if(bg) {
      bg.onclick = () => {
        openDeleteTaskModal(swipeItemId);
      };
    }
  } else { 
    content.style.transform = `translateX(0)`;
  }
  swipeItemId = null;
});

// --- First-Run Splash ---
document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('sf_first_run')) {
    const splashModal = document.getElementById('splashModal');
    if(splashModal) splashModal.classList.add('active');
    
    document.getElementById('btnDismissSplash')?.addEventListener('click', () => {
      localStorage.setItem('sf_first_run', 'true');
      splashModal.classList.remove('active');
      appleHaptic('success');
    });
  }
});

// Ensure init runs
document.addEventListener('DOMContentLoaded', initApp);
