function renderContactPage() {
  document.getElementById('main-content').innerHTML = `
    <div class="card" style="max-width:600px; margin:auto;">
      <h2 style="color:#FF8C00;"><i class="fas fa-envelope"></i> Contact Us</h2>
      <p style="color:#718096;">Having trouble or want to give us feedback? Reach out below.</p>

      <div style="display:flex; flex-wrap:wrap; gap:20px; margin-bottom:30px; background:#F7FAFC; border-radius:12px; padding:20px;">
        <div><i class="fas fa-phone"></i> <strong>Phone:</strong> +254 796 916029</div>
        <div><i class="fas fa-envelope"></i> <strong>Support:</strong> support@smartpos.com</div>
        <div><i class="fas fa-code"></i> <strong>Developer:</strong> dev@smartpos.com</div>
      </div>

      <form id="contact-form">
        <div class="form-group">
          <label>Your Name *</label>
          <input type="text" id="contact-name" class="input-field" required>
        </div>
        <div class="form-group">
          <label>Your Email *</label>
          <input type="email" id="contact-email" class="input-field" required>
        </div>
        <div class="form-group">
          <label>Message *</label>
          <textarea id="contact-message" class="input-field" rows="5" required style="resize:vertical;"></textarea>
        </div>
        <button type="submit" class="btn btn-primary w-full" style="background:#FF8C00;">
          <i class="fas fa-paper-plane"></i> Send Message
        </button>
      </form>
      <div id="contact-response" class="mt-20"></div>
    </div>
  `;

  document.getElementById('contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('contact-name').value;
    const email = document.getElementById('contact-email').value;
    const message = document.getElementById('contact-message').value;
    const respDiv = document.getElementById('contact-response');
    try {
      const res = await api.post('/contact/submit/', { name, email, message });
      respDiv.innerHTML = `<div class="toast toast-success">${res.data.message}</div>`;
      document.getElementById('contact-form').reset();
    } catch (err) {
      respDiv.innerHTML = `<div class="toast toast-error">${err.response?.data?.error || 'Failed to send'}</div>`;
    }
  });
}