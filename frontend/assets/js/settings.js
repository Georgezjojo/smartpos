/* ========== SETTINGS PAGE ========== */
function renderSettings() {
  document.getElementById('main-content').innerHTML = `
    <div class="card">
      <h3><i class="fas fa-building"></i> Business Settings</h3>
      <div class="form-group">
        <label>Business Name *</label>
        <input type="text" id="biz-name" class="input-field" placeholder="Your business name">
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="biz-email" class="input-field" placeholder="business@example.com">
      </div>
      <div class="form-group">
        <label>Phone</label>
        <input type="tel" id="biz-phone" class="input-field" placeholder="+254...">
      </div>
      <div class="form-group">
        <label>Address</label>
        <input type="text" id="biz-address" class="input-field" placeholder="Street, City">
      </div>
      <div class="form-group">
        <label>Logo URL (optional)</label>
        <input type="url" id="biz-logo" class="input-field" placeholder="https://example.com/logo.png">
      </div>
      <button class="btn btn-primary" onclick="updateBusiness()">
        <i class="fas fa-save"></i> Save Business Details
      </button>
    </div>

    <div class="card mt-20">
      <h3><i class="fas fa-code-branch"></i> Branches</h3>
      <div id="branch-list"></div>
      <button class="btn btn-secondary mt-10" onclick="showAddBranchModal()">
        <i class="fas fa-plus"></i> Add Branch
      </button>
    </div>
  `;

  loadBusinessSettings();
  loadBranches();
}

// ---------- Load current business data ----------
async function loadBusinessSettings() {
  try {
    const res = await getBusiness();
    if (res.results && res.results[0]) {
      const b = res.results[0];
      document.getElementById('biz-name').value = b.name || '';
      document.getElementById('biz-email').value = b.email || '';
      document.getElementById('biz-phone').value = b.phone || '';
      document.getElementById('biz-address').value = b.address || '';
      document.getElementById('biz-logo').value = b.logo || '';
    }
  } catch (e) {
    showToast('Could not load business details', 'error');
  }
}

// ---------- Save business details ----------
async function updateBusiness() {
  const data = {
    name: document.getElementById('biz-name').value,
    email: document.getElementById('biz-email').value,
    phone: document.getElementById('biz-phone').value,
    address: document.getElementById('biz-address').value,
    logo: document.getElementById('biz-logo').value,
  };

  try {
    const bizRes = await getBusiness();
    const bizId = bizRes.results?.[0]?.id;
    if (!bizId) {
      showToast('No business found', 'error');
      return;
    }
    await api.put(`/business/businesses/${bizId}/`, data);
    showToast('Business details saved!', 'success');
    // Refresh header logo if needed
    loadUserInfo();
  } catch (err) {
    showToast(err.response?.data?.detail || 'Failed to save', 'error');
  }
}

// ---------- Load branches ----------
async function loadBranches() {
  try {
    const res = await getBranches();
    const list = document.getElementById('branch-list');
    const branches = res.results || [];
    if (branches.length === 0) {
      list.innerHTML = '<p class="text-center text-muted">No branches added yet.</p>';
      return;
    }
    list.innerHTML = branches.map(b =>
      `<div class="flex-between" style="padding:10px; border-bottom:1px solid var(--border-light); flex-wrap:wrap; gap:5px;">
        <span style="flex:1; min-width:150px;"><strong>${b.name}</strong> – ${b.location}</span>
        <span style="color:#718096;">${b.phone || ''}</span>
      </div>`
    ).join('');
  } catch (e) {
    showToast('Failed to load branches', 'error');
  }
}

// ---------- Add Branch Modal ----------
function showAddBranchModal() {
  const modal = document.getElementById('modal-overlay');
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Add Branch</h3>
      <form id="add-branch-form">
        <div class="form-group">
          <label>Branch Name *</label>
          <input type="text" id="branch-name" class="input-field" placeholder="e.g., Main Branch" required>
        </div>
        <div class="form-group">
          <label>Location *</label>
          <input type="text" id="branch-location" class="input-field" placeholder="City or area" required>
        </div>
        <div class="form-group">
          <label>Phone (optional)</label>
          <input type="text" id="branch-phone" class="input-field" placeholder="+254...">
        </div>
        <button type="submit" class="btn btn-primary w-full">Create Branch</button>
      </form>
    </div>`;

  document.getElementById('add-branch-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('branch-name').value.trim(),
      location: document.getElementById('branch-location').value.trim(),
      phone: document.getElementById('branch-phone').value.trim(),
    };
    if (!data.name || !data.location) {
      showToast('Name and Location are required.', 'error');
      return;
    }
    try {
      await api.post('/business/branches/', data);
      modal.classList.add('hidden');
      loadBranches();
      showToast('Branch added successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to add branch', 'error');
    }
  });
}


/* ========== PROFILE PAGE (unchanged) ========== */
function renderProfile() {
  document.getElementById('main-content').innerHTML = `
    <div class="card">
      <h3>My Profile</h3>
      <form id="profile-form">
        <div class="form-group"><label>Full Name</label><input type="text" id="profile-name" class="input-field"></div>
        <div class="form-group"><label>Phone</label><input type="text" id="profile-phone" class="input-field"></div>
        <div class="form-group"><label>Profile Picture</label><input type="file" id="profile-pic" class="input-field"></div>
        <button type="submit" class="btn btn-primary">Update Profile</button>
      </form>
    </div>
  `;
  loadProfile();
  document.getElementById('profile-form').addEventListener('submit', handleProfileUpdate);
}

async function loadProfile() {
  try {
    const profile = await getProfile();
    document.getElementById('profile-name').value = profile.full_name || '';
    document.getElementById('profile-phone').value = profile.phone || '';
  } catch (e) {
    showToast('Failed to load profile', 'error');
  }
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  const formData = new FormData();
  formData.append('full_name', document.getElementById('profile-name').value);
  formData.append('phone', document.getElementById('profile-phone').value);
  const pic = document.getElementById('profile-pic').files[0];
  if (pic) formData.append('profile_picture', pic);
  try {
    await api.put('/auth/profile/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    showToast('Profile updated', 'success');
  } catch (err) {
    showToast(err.response?.data?.detail || 'Update failed', 'error');
  }
}