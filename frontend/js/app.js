// FinSentinel - Core Application & Routing Controller
const API_BASE = '/api';

class AppController {
  constructor() {
    this.token = localStorage.getItem('finsentinel_token') || '';
    const savedUser = localStorage.getItem('finsentinel_user');
    this.currentUser = savedUser ? JSON.parse(savedUser) : {
      username: 'Aditya Sharma',
      email: 'demo@finsentinel.local',
      is_demo: true
    };
    this.currentView = 'dashboard';
    this.init();
  }

  async init() {
    this.bindEvents();
    this.updateUserUI();
    // Default load dashboard
    this.switchView('dashboard');
  }

  bindEvents() {
    // Sidebar navigation clicks
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const view = item.getAttribute('data-view');
        if (view) this.switchView(view);
      });
    });

    // Profile dropdown toggle
    const btnProfile = document.getElementById('btn-user-profile');
    const dropdown = document.getElementById('user-dropdown-menu');
    if (btnProfile && dropdown) {
      btnProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
      });
      document.addEventListener('click', () => {
        dropdown.classList.remove('active');
      });
    }

    // Open Auth Modal button
    const btnOpenAuth = document.getElementById('btn-open-auth-modal');
    if (btnOpenAuth) {
      btnOpenAuth.addEventListener('click', () => this.openAuthModal('login'));
    }

    // Auth forms
    const formLogin = document.getElementById('form-auth-login');
    if (formLogin) {
      formLogin.addEventListener('submit', (e) => this.handleLogin(e));
    }

    const formRegister = document.getElementById('form-auth-register');
    if (formRegister) {
      formRegister.addEventListener('submit', (e) => this.handleRegister(e));
    }

    // Modal background click close
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });
  }

  switchView(viewName) {
    this.currentView = viewName;

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });

    // Hide all view sections, show active
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const targetSec = document.getElementById(`view-${viewName}`);
    if (targetSec) {
      targetSec.classList.add('active');
    }

    // Update page title
    const titles = {
      'dashboard': 'Security Overview',
      'collect-scanner': 'Fake UPI Collect Scanner',
      'phishing-detector': 'Phishing & Scam Detector',
      'transaction-analyser': 'Transaction Anomaly Analyser',
      'fraud-alerts': 'Active Fraud Alerts',
      'analysis-history': 'Security Analysis History',
      'security-insights': 'Security Insights & Education',
      'settings-view': 'Platform Status & Settings'
    };
    const titleEl = document.getElementById('current-page-title');
    if (titleEl) titleEl.textContent = titles[viewName] || 'Dashboard';

    // Refresh lucide icons
    if (window.lucide) {
      setTimeout(() => lucide.createIcons(), 50);
    }

    // Trigger view-specific data loads
    if (viewName === 'dashboard' && window.dashboard) {
      window.dashboard.loadDashboard();
    } else if (viewName === 'fraud-alerts' && window.dashboard) {
      window.dashboard.loadAlertsView();
    } else if (viewName === 'analysis-history' && window.historyManager) {
      window.historyManager.loadHistory();
    }
  }

  async apiRequest(endpoint, options = {}) {
    const headers = options.headers || {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP Error ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      this.showToast(err.message || 'Network request failed', 'error');
      throw err;
    }
  }

  openAuthModal(tab = 'login') {
    this.switchAuthTab(tab);
    this.openModal('modal-auth');
  }

  switchAuthTab(tab) {
    const btnLogin = document.getElementById('tab-btn-login');
    const btnReg = document.getElementById('tab-btn-register');
    const panelLogin = document.getElementById('auth-panel-login');
    const panelReg = document.getElementById('auth-panel-register');

    if (tab === 'login') {
      btnLogin.classList.add('active');
      btnReg.classList.remove('active');
      panelLogin.style.display = 'block';
      panelReg.style.display = 'none';
    } else {
      btnReg.classList.add('active');
      btnLogin.classList.remove('active');
      panelReg.style.display = 'block';
      panelLogin.style.display = 'none';
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('auth-login-email').value.trim();
    const password = document.getElementById('auth-login-password').value;

    try {
      this.showToast('Signing in...', 'info');
      const data = await this.apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      this.token = data.access_token;
      this.currentUser = {
        username: data.username,
        email: data.email,
        is_demo: data.is_demo
      };

      localStorage.setItem('finsentinel_token', this.token);
      localStorage.setItem('finsentinel_user', JSON.stringify(this.currentUser));

      this.closeModal('modal-auth');
      this.updateUserUI();
      this.showToast(`Welcome back, ${data.username}! Normal Mode is active.`, 'success');
      this.refreshCurrentView();
    } catch (err) {
      // toast shown in apiRequest
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('auth-register-name').value.trim();
    const email = document.getElementById('auth-register-email').value.trim();
    const password = document.getElementById('auth-register-password').value;

    try {
      this.showToast('Creating your account...', 'info');
      const data = await this.apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password })
      });

      this.token = data.access_token;
      this.currentUser = {
        username: data.username,
        email: data.email,
        is_demo: false
      };

      localStorage.setItem('finsentinel_token', this.token);
      localStorage.setItem('finsentinel_user', JSON.stringify(this.currentUser));

      this.closeModal('modal-auth');
      this.updateUserUI();
      this.showToast(`Account successfully created for ${username}! You are now in Live Personal Mode.`, 'success');
      this.refreshCurrentView();
    } catch (err) {
      // toast shown in apiRequest
    }
  }

  async switchToDemoAccount() {
    try {
      this.showToast('Switching to Showcase Profile (Aditya Sharma)...', 'info');
      const data = await this.apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'demo@finsentinel.local',
          password: 'FinSentinel@2026'
        })
      });

      this.token = data.access_token;
      this.currentUser = {
        username: data.username,
        email: data.email,
        is_demo: true
      };

      localStorage.setItem('finsentinel_token', this.token);
      localStorage.setItem('finsentinel_user', JSON.stringify(this.currentUser));

      this.closeModal('modal-auth');
      const dropdown = document.getElementById('user-dropdown-menu');
      if (dropdown) dropdown.classList.remove('active');

      this.updateUserUI();
      this.showToast('Switched to pre-configured Showcase Profile with sample datasets!', 'success');
      this.refreshCurrentView();
    } catch (err) {
      // Handled in apiRequest
    }
  }

  logoutUser() {
    if (window.txDetector) window.txDetector.clearResults();
    this.token = '';
    localStorage.removeItem('finsentinel_token');
    localStorage.removeItem('finsentinel_user');

    const dropdown = document.getElementById('user-dropdown-menu');
    if (dropdown) dropdown.classList.remove('active');

    // Default to clean state or open login
    this.currentUser = {
      username: 'Guest User',
      email: 'guest@finsentinel.local',
      is_demo: false
    };
    this.updateUserUI();
    this.showToast('You have signed out. Sign in or register to protect your transactions.', 'info');
    this.openAuthModal('login');
  }

  updateUserUI() {
    const nameEl = document.getElementById('user-display-name');
    const avatarEl = document.getElementById('user-avatar-initials');
    const dropdownName = document.getElementById('dropdown-user-name');
    const dropdownEmail = document.getElementById('dropdown-user-email');
    const modeBadge = document.getElementById('platform-mode-badge');
    const authBtn = document.getElementById('btn-open-auth-modal');

    if (nameEl) nameEl.textContent = this.currentUser.username;
    if (dropdownName) dropdownName.textContent = this.currentUser.username;
    if (dropdownEmail) dropdownEmail.textContent = this.currentUser.email;

    if (avatarEl) {
      const parts = this.currentUser.username.split(' ');
      const initials = parts.map(p => p[0]).join('').slice(0, 2).toUpperCase();
      avatarEl.textContent = initials || 'US';
    }

    if (modeBadge) {
      if (this.currentUser.is_demo) {
        modeBadge.className = 'shield-status-pill';
        modeBadge.innerHTML = `<i data-lucide="shield-check" style="width: 14px; height: 14px;"></i> Live Shield Active`;
      } else {
        modeBadge.className = 'shield-status-pill personal';
        modeBadge.innerHTML = `<i data-lucide="user-check" style="width: 14px; height: 14px;"></i> Personal Account (Normal Mode)`;
      }
    }

    if (authBtn) {
      if (!this.currentUser.is_demo && this.token) {
        authBtn.innerHTML = `<i data-lucide="user-check" style="width: 14px; height: 14px;"></i> Normal Mode`;
        authBtn.onclick = () => this.showToast(`Logged in as ${this.currentUser.username} (${this.currentUser.email})`, 'info');
      } else {
        authBtn.innerHTML = `<i data-lucide="user-plus" style="width: 14px; height: 14px;"></i> Sign In / Register`;
        authBtn.onclick = () => this.openAuthModal('login');
      }
    }

    if (window.lucide) lucide.createIcons();
  }

  refreshCurrentView() {
    if (window.dashboard) window.dashboard.loadDashboard();
    if (window.historyManager) window.historyManager.loadHistory();
  }

  async resetDemoData() {
    try {
      this.showToast('Resetting showcase baseline data...', 'info');
      await this.apiRequest('/dashboard/reset-demo', { method: 'POST' });
      this.showToast('Showcase data successfully restored to baseline!', 'success');
      this.refreshCurrentView();
    } catch (err) {
      // toast shown in apiRequest
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i data-lucide="${type === 'success' ? 'check-circle' : (type === 'error' ? 'alert-triangle' : 'info')}" style="width: 18px; height: 18px;"></i>
      <span style="font-size: 0.88rem;">${message}</span>
    `;
    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      if (window.lucide) lucide.createIcons();
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }
}

// Global App Instance
window.app = new AppController();
