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

    document.addEventListener('click', function(e) {
      if (e.target.id === 'modal-overlay') {
        e.target.classList.add('hidden');
      }
    });
  } catch (err) {
    console.error('App initialization error:', err);
    showToast('Something went wrong. Please refresh.', 'error');
  }
});