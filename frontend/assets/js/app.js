document.addEventListener('DOMContentLoaded', () => {
  try {
    renderHeader();
    renderSidebar();
    if (localStorage.getItem('theme') === 'dark') {
      document.body.classList.add('dark-mode');
      const icon = document.querySelector('.theme-toggle i');
      if (icon) icon.className = 'fas fa-sun';
    }
    initRouter();

    // Close sidebar on mobile when clicking outside of it (backdrop handled in components.js)
    document.addEventListener('click', function(e) {
      if (e.target.id === 'modal-overlay') {
        e.target.classList.add('hidden');
      }
    });

    // Close sidebar on mobile after any hash change (route navigation)
    window.addEventListener('hashchange', () => {
      if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('open')) {
          sidebar.classList.remove('open');
          removeSidebarBackdrop();
        }
      }
    });

    // Ensure the mobile toggle button (added in index.html) calls toggleSidebar
    const mobileToggleBtn = document.getElementById('sidebar-toggle');
    if (mobileToggleBtn && !mobileToggleBtn._bound) {
      mobileToggleBtn.addEventListener('click', toggleSidebar);
      mobileToggleBtn._bound = true;
    }
  } catch (err) {
    console.error('App initialization error:', err);
    showToast('Something went wrong. Please refresh.', 'error');
  }
});