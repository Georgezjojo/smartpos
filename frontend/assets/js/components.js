let currentUser = null;

/* ========== HEADER ========== */
function renderHeader() {
  const header = document.getElementById('header');
  header.innerHTML = `
    <div class="header-left">
      <i class="fas fa-bars menu-toggle" onclick="toggleSidebar()"></i>
      <div class="header-logo">
        <i class="fas fa-store-alt" style="font-size:1.8rem; color:var(--primary);"></i>
        <span class="logo-text">SmartPOS</span>
      </div>
    </div>

    <!-- CENTERED SEARCH BAR -->
    <div class="header-center">
      <div class="global-search-wrapper">
        <input type="text" id="global-search" class="input-field" placeholder="Search products, sales, customers...">
        <button class="btn btn-primary search-btn" onclick="performGlobalSearch()" style="background: white; color: #FF8C00; border-radius:0 8px 8px 0; margin:0; padding:0 20px;">
          <i class="fas fa-search"></i>
        </button>
      </div>
      <div id="search-results" class="search-dropdown hidden"></div>
    </div>

    <div class="header-right">
      <button class="btn btn-outline btn-sm" onclick="window.location.hash='#/pos'" title="New Sale">
        <i class="fas fa-plus-circle"></i> <span class="btn-text">New Sale</span>
      </button>
      <button class="btn btn-outline btn-sm" onclick="window.print()" title="Print current page">
        <i class="fas fa-print"></i> <span class="btn-text">Print</span>
      </button>
      <button class="theme-toggle" onclick="toggleDarkMode()" title="Toggle dark mode">
        <i class="fas fa-moon"></i>
      </button>
      <div class="notification-bell" onclick="window.location.hash='#/notifications'" title="Notifications">
        <i class="fas fa-bell"></i>
        <span class="badge" id="notif-count" style="display:none;">0</span>
      </div>

      <!-- Avatar with dropdown (no name beside icon) -->
      <div class="user-menu" id="userMenu" onclick="toggleUserDropdown(event)">
        <div class="avatar-sm" id="header-avatar" 
             style="display:flex; align-items:center; justify-content:center;
                    background:#6C5CE7; color:white; font-weight:700; font-size:1rem;">
          BB
        </div>
        <i class="fas fa-caret-down" style="margin-left:2px; font-size:0.8rem;"></i>
        <div class="user-dropdown hidden" id="userDropdown">
          <div class="dropdown-user-info" id="dropdown-user-info">
            <strong id="dropdown-fullname"></strong>
            <small id="dropdown-role"></small>
          </div>
          <a href="#/profile"><i class="fas fa-user-circle"></i> My Profile</a>
          <a href="#/settings"><i class="fas fa-cog"></i> Settings</a>
          <a href="#" onclick="event.stopPropagation(); logout();"><i class="fas fa-sign-out-alt"></i> Logout</a>
        </div>
      </div>
    </div>
  `;

  // ===== Floating AI Bubble (Meta‑style) =====
  const aiBubble = document.createElement('div');
  aiBubble.id = 'ai-floating-bubble';
  aiBubble.innerHTML = `
    <div class="ai-fab" id="ai-fab" onclick="navigateToAI()" title="AI Assistant">
      <i class="fas fa-robot"></i>
    </div>
  `;
  document.body.appendChild(aiBubble);

  document.getElementById('global-search').addEventListener('input', debounce(performGlobalSearch, 300));
  loadUserInfo();
}

/* ========== AI BUBBLE NAVIGATION ========== */
function navigateToAI() {
  if (window.location.hash === '#/ai') {
    window.location.hash = '#/dashboard';
  } else {
    window.location.hash = '#/ai';
  }
}

/* ========== USER DROPDOWN ========== */
function toggleUserDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) dropdown.classList.toggle('hidden');
}

document.addEventListener('click', function(e) {
  const menu = document.getElementById('userMenu');
  const dropdown = document.getElementById('userDropdown');
  if (menu && !menu.contains(e.target) && dropdown) {
    dropdown.classList.add('hidden');
  }
});

/* ========== SIDEBAR (updated with Customers link) ========== */
function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = `
    <nav class="sidebar-nav">
      <a href="#/dashboard" class="nav-item"><i class="fas fa-chart-line"></i> Dashboard</a>
      <a href="#/pos" class="nav-item pos-button"><i class="fas fa-cash-register"></i> Point of Sale</a>
      <a href="#/inventory" class="nav-item"><i class="fas fa-boxes"></i> Inventory</a>
      <a href="#/transfers" class="nav-item"><i class="fas fa-exchange-alt"></i> Stock Transfer</a>
      <a href="#/reports" class="nav-item"><i class="fas fa-file-invoice"></i> Reports</a>
      <a href="#/expenses" class="nav-item"><i class="fas fa-receipt"></i> Expenses</a>
      <a href="#/users" class="nav-item admin-only"><i class="fas fa-users"></i> Users</a>
      <a href="#/customers" class="nav-item"><i class="fas fa-users"></i> Customers</a>   <!-- NEW -->
      <a href="#/ai" class="nav-item"><i class="fas fa-robot"></i> AI Assistant</a>
      <a href="#/notifications" class="nav-item"><i class="fas fa-bell"></i> Notifications</a>
      <a href="#/profile" class="nav-item"><i class="fas fa-user-circle"></i> Profile</a>
      <a href="#/settings" class="nav-item admin-only"><i class="fas fa-cog"></i> Settings</a>
      <a href="#/contact" class="nav-item"><i class="fas fa-envelope"></i> Contact Us</a>
      <a href="#" onclick="logout()" class="nav-item"><i class="fas fa-sign-out-alt"></i> Logout</a>
    </nav>
  `;

  // Close sidebar on mobile after any nav link click
  sidebar.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        closeSidebar();
      }
    });
  });
}

/* ---------- Sidebar toggling ---------- */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const isOpen = sidebar.classList.toggle('open');
  if (isOpen) {
    showSidebarBackdrop();
  } else {
    removeSidebarBackdrop();
  }
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('open');
  removeSidebarBackdrop();
}

/* ---------- Sidebar backdrop for mobile ---------- */
function createSidebarBackdrop() {
  let backdrop = document.getElementById('sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'sidebar-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.4);
      z-index: 998;
      display: none;
    `;
    backdrop.addEventListener('click', closeSidebar);
    document.body.appendChild(backdrop);
  }
  return backdrop;
}

function showSidebarBackdrop() {
  const backdrop = createSidebarBackdrop();
  backdrop.style.display = 'block';
}

function removeSidebarBackdrop() {
  const backdrop = document.getElementById('sidebar-backdrop');
  if (backdrop) backdrop.style.display = 'none';
}

/* ========== THEME ========== */
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
  const icon = document.querySelector('.theme-toggle i');
  icon.className = document.body.classList.contains('dark-mode') ? 'fas fa-sun' : 'fas fa-moon';
}

/* ========== TOAST ========== */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* ========== USER INFO & ROLE ========== */
async function loadUserInfo() {
  try {
    const profile = await getProfile();
    currentUser = profile;

    let initials = 'BB';
    try {
      const bizRes = await getBusiness();
      const biz = bizRes.results?.[0] || bizRes;
      if (biz && biz.name) {
        initials = biz.name.replace(/[^A-Za-z]/g, '').substring(0,2).toUpperCase();
      }
    } catch (e) {}
    const avatar = document.getElementById('header-avatar');
    if (avatar) avatar.textContent = initials;

    document.getElementById('dropdown-fullname').textContent = profile.full_name;
    document.getElementById('dropdown-role').textContent =
      profile.role.charAt(0).toUpperCase() + profile.role.slice(1);

    if (profile.role === 'cashier') {
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.nav-item').forEach(el => {
        const href = el.getAttribute('href');
        if (!href || !['#/pos', '#/profile', '#/contact'].includes(href)) {
          el.style.display = 'none';
        }
      });
    } else if (profile.role === 'manager') {
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }

    try {
      const countRes = await api.get('/notifications/unread-count/');
      const badge = document.getElementById('notif-count');
      if (badge) {
        const count = countRes.data.count || 0;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
      }
    } catch (e) { /* ignore */ }

  } catch (e) { /* not logged in */ }
}

/* ========== GLOBAL SEARCH ========== */
async function performGlobalSearch() {
  const query = document.getElementById('global-search').value.trim();
  if (query.length < 2) {
    document.getElementById('search-results').classList.add('hidden');
    return;
  }

  try {
    const res = await api.get(`/search/?q=${encodeURIComponent(query)}`);
    const data = res.data;
    const dropdown = document.getElementById('search-results');
    let html = '';
    if (data.products?.length) {
      html += '<div class="search-section-title"><i class="fas fa-box"></i> Products</div>';
      data.products.forEach(p => html += `<div class="search-item" onclick="window.location.hash='#/inventory'">📦 ${p.name} – ${p.price} KES</div>`);
    }
    if (data.sales?.length) {
      html += '<div class="search-section-title"><i class="fas fa-shopping-cart"></i> Sales</div>';
      data.sales.forEach(s => html += `<div class="search-item" onclick="window.location.hash='#/reports'">🧾 Sale #${s.id.slice(0,8)} – ${s.total_amount} KES (${new Date(s.created_at).toLocaleDateString()})</div>`);
    }
    if (data.customers?.length) {
      html += '<div class="search-section-title"><i class="fas fa-user"></i> Customers</div>';
      data.customers.forEach(c => html += `<div class="search-item" onclick="window.location.hash='#/inventory'">👤 ${c.name} – ${c.phone || ''}</div>`);
    }
    if (!html) html = '<div class="search-item text-center">No results found</div>';
    dropdown.innerHTML = html;
    dropdown.classList.remove('hidden');
  } catch (e) {
    document.getElementById('search-results').classList.add('hidden');
  }
}

/* ========== LOGOUT ========== */
function logout() {
  localStorage.clear();
  window.location.hash = '#/login';
}

/* ---------- Bind mobile toggle button (exists in index.html) ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const mobileToggleBtn = document.getElementById('sidebar-toggle');
  if (mobileToggleBtn) {
    mobileToggleBtn.addEventListener('click', toggleSidebar);
  }
});