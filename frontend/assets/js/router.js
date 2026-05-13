const routes = {
  '': renderHomepage,
  'login': renderLoginPage,
  'register': renderRegisterPage,
  'otp-verification': renderOTPPage,
  'forgot-password': renderForgotPasswordPage,
  'dashboard': renderDashboard,
  'pos': renderPOS,
  'inventory': renderInventory,
  'reports': renderReports,
  'expenses': renderExpenses,
  'users': renderUsers,
  'notifications': renderNotifications,
  'profile': renderProfile,
  'settings': renderSettings,
  'terms': renderTermsOfService,
  'privacy': renderPrivacyPolicy,
  'ai': renderAIPage,
  'contact': renderContactPage,
  'transfers': renderTransfers,
  'customers': renderCustomers,          // ← added the customers page
};

function router() {
  const hash = window.location.hash.substring(1) || '/';
  const route = hash.startsWith('/') ? hash.substring(1) : hash;
  const token = localStorage.getItem('access_token');
  const protectedRoutes = [
    'dashboard', 'pos', 'inventory', 'reports', 'expenses',
    'users', 'notifications', 'profile', 'settings', 'ai',
    'contact', 'transfers', 'customers'     // ← added customers to protected routes
  ];

  // Show/hide footer & AI bubble based on current page
  if (route === 'ai' || route === 'pos') {
    document.body.setAttribute('data-page', route);
  } else {
    document.body.removeAttribute('data-page');
  }

  if (route === '' || route === 'login' || route === 'register' || route === 'otp-verification' || route === 'forgot-password') {
    document.body.classList.add('public-page');
  } else {
    document.body.classList.remove('public-page');
  }

  if (token) {
    loadUserInfo();
  }

  if (!token && protectedRoutes.includes(route)) {
    window.location.hash = '#/login';
    return;
  }

  if (routes[route]) {
    routes[route]();
  } else {
    document.getElementById('main-content').innerHTML =
      '<div class="card text-center"><h2>404 - Page Not Found</h2></div>';
  }
  updateActiveNav(route);

  // Close mobile sidebar after navigating to a new page
  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      removeSidebarBackdrop();   // defined in components.js
    }
  }
}

function updateActiveNav(route) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const activeLink = document.querySelector(`.nav-item[href="#/${route}"]`);
  if (activeLink) activeLink.classList.add('active');
}

function initRouter() {
  window.addEventListener('hashchange', router);
  router();
}