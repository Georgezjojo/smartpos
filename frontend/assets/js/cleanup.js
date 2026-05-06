(function() {
  // Remove any leftover splash or overlay
  const splash = document.getElementById('splash-screen');
  if (splash) splash.remove();
  
  const overlays = document.querySelectorAll('#public-overlay');
  overlays.forEach(el => { if (el !== document.getElementById('public-overlay')) el.remove(); });

  // Ensure modal is hidden on startup
  const modal = document.getElementById('modal-overlay');
  if (modal) modal.classList.add('hidden');

  // Enable pointer events on everything
  document.querySelectorAll('*').forEach(el => {
    if (el.style.pointerEvents === 'none') el.style.pointerEvents = 'auto';
  });
})();