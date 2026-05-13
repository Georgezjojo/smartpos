// ========== USERS PAGE ==========
async function renderUsers() {
  document.getElementById('main-content').innerHTML = `
    <div class="card" style="background: linear-gradient(135deg, #FF8C00, #FF5E7E); color: white; margin-bottom: 20px;">
      <div class="flex-between" style="flex-wrap:wrap; gap:10px;">
        <h2><i class="fas fa-users-cog"></i> User Management</h2>
        <button class="btn btn-sm" id="add-user-btn" onclick="showAddUserModal()" style="background: white; color: #FF5E7E; display:none;">
          <i class="fas fa-user-plus"></i> Add User
        </button>
      </div>
      <p id="user-page-desc" style="opacity:0.9;">Loading…</p>
      <div style="margin-top:15px; position:relative;">
        <input type="text" id="user-search" class="input-field" 
               placeholder="🔍 Search users..." 
               oninput="filterUsers()" 
               style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; width:100%;">
      </div>
    </div>
    <div id="user-list" class="user-grid"></div>
  `;

  await loadUsers();

  try {
    const profile = await getProfile();
    if (profile && (profile.role === 'owner' || profile.role === 'manager')) {
      document.getElementById('add-user-btn').style.display = 'inline-block';
    }
    if (profile.role === 'owner') {
      document.getElementById('user-page-desc').textContent = 'Manage all staff members and their branch assignments.';
    } else if (profile.role === 'manager') {
      document.getElementById('user-page-desc').textContent = 'Your team members.';
    }
  } catch(e) {}
}

// ---------- Load all users ----------
async function loadUsers() {
  try {
    const res = await api.get('/auth/users/');
    const list = document.getElementById('user-list');
    const users = res.data.results || [];

    if (users.length === 0) {
      list.innerHTML = '<div class="card text-center"><i class="fas fa-users-slash" style="font-size:2rem; color:#718096;"></i><p>No users found.</p></div>';
      return;
    }

    list.innerHTML = users.map(u => {
      const roleColor = u.role === 'owner' ? '#FF8C00' : (u.role === 'manager' ? '#38A169' : '#3182CE');
      const roleIcon = u.role === 'owner' ? '👑' : (u.role === 'manager' ? '🔧' : '💼');
      // Build a searchable data string for filtering
      const searchData = `${u.full_name} ${u.email || ''} ${u.phone || ''} ${u.role} ${u.branch_name || ''}`.toLowerCase();
      return `
        <div class="user-card" data-search="${searchData}" style="border-left: 5px solid ${roleColor};">
          <div class="user-card-body">
            <div class="flex-between" style="flex-wrap:wrap; gap:10px;">
              <div>
                <h4 style="margin:0;">${u.full_name}</h4>
                <small style="color:#718096;">${u.email || u.phone || 'No contact'}</small>
              </div>
              <span class="role-badge" style="background:${roleColor}; color:white; padding:4px 14px; border-radius:20px; font-size:0.85rem; font-weight:600;">
                ${roleIcon} ${u.role}
              </span>
            </div>
            <div style="margin-top:10px; display:flex; gap:15px; flex-wrap:wrap; font-size:0.9rem; color: #4A5568;">
              ${u.branch_name ? `<span><i class="fas fa-map-marker-alt"></i> ${u.branch_name}</span>` : '<span><i class="fas fa-map-marker-alt"></i> No branch</span>'}
              ${u.manager_name ? `<span><i class="fas fa-user-tie"></i> Manager: ${u.manager_name}</span>` : ''}
            </div>
            <div style="margin-top:10px; display:flex; gap:10px;">
              <button class="btn btn-sm btn-outline" onclick="editUser('${u.id}')"><i class="fas fa-edit"></i> Edit</button>
              ${u.role !== 'owner' ? `<button class="btn btn-sm btn-accent" onclick="deleteUser('${u.id}')"><i class="fas fa-trash"></i> Delete</button>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    showToast('Failed to load users', 'error');
  }
}

// ---------- Search / Filter users ----------
function filterUsers() {
  const query = document.getElementById('user-search')?.value.toLowerCase() || '';
  document.querySelectorAll('.user-card').forEach(card => {
    const searchData = card.dataset.search || '';
    card.style.display = searchData.includes(query) ? '' : 'none';
  });
}

// ---- ADD USER MODAL ----
async function showAddUserModal() {
  let branchOptions = '<option value="">-- Main Branch (none) --</option>';
  try {
    const branchRes = await api.get('/business/branches/');
    const branches = branchRes.data.results || [];
    branchOptions += branches.map(b => `<option value="${b.id}">${b.name} - ${b.location}</option>`).join('');
  } catch(e) {}

  const modal = document.getElementById('modal-overlay');
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <div class="modal-content">
      <h3 style="color:#FF8C00;"><i class="fas fa-user-plus"></i> Add New User</h3>
      <p style="color:#718096; font-size:0.9rem;">The manager will be automatically assigned based on the selected branch.</p>
      <form id="add-user-form">
        <div class="form-group">
          <label>Full Name *</label>
          <input type="text" id="user-fullname" class="input-field" placeholder="Full Name" required>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="user-email" class="input-field" placeholder="Email (optional)">
        </div>
        <div class="form-group">
          <label>Phone</label>
          <input type="text" id="user-phone" class="input-field" placeholder="Phone (optional)">
        </div>
        <div class="form-group">
          <label>Role *</label>
          <select id="user-role" class="input-field" required>
            <option value="">-- Select Role --</option>
            <option value="cashier">Cashier / Accountant</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        <div class="form-group">
          <label>Branch</label>
          <select id="user-branch" class="input-field">
            ${branchOptions}
          </select>
        </div>
        <div class="form-group">
          <label>Password *</label>
          <input type="password" id="user-password" class="input-field" placeholder="Password" required>
        </div>
        <button type="submit" class="btn btn-primary w-full" style="background:#FF8C00;">Create User</button>
      </form>
    </div>`;

  document.getElementById('add-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      full_name: document.getElementById('user-fullname').value.trim(),
      email: document.getElementById('user-email').value.trim(),
      phone: document.getElementById('user-phone').value.trim(),
      role: document.getElementById('user-role').value,
      password: document.getElementById('user-password').value,
    };
    const branchId = document.getElementById('user-branch').value;
    if (branchId) data.branch = branchId;

    if (!data.full_name || !data.role || !data.password) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    try {
      await api.post('/auth/users/', data);
      modal.classList.add('hidden');
      loadUsers();
      showToast('User created successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to create user', 'error');
    }
  });
}

// ---------- EDIT USER MODAL ----------
async function editUser(id) {
  // Fetch user details first
  try {
    const res = await api.get(`/auth/users/${id}/`);
    const u = res.data;

    // Fetch branches for dropdown
    let branchOptions = '<option value="">-- Main Branch (none) --</option>';
    try {
      const branchRes = await api.get('/business/branches/');
      const branches = branchRes.data.results || [];
      branchOptions += branches.map(b => `<option value="${b.id}" ${u.branch === b.id ? 'selected' : ''}>${b.name} - ${b.location}</option>`).join('');
    } catch(e) {}

    const modal = document.getElementById('modal-overlay');
    modal.classList.remove('hidden');
    modal.innerHTML = `
      <div class="modal-content">
        <h3 style="color:#FF8C00;"><i class="fas fa-edit"></i> Edit User</h3>
        <form id="edit-user-form">
          <div class="form-group">
            <label>Full Name *</label>
            <input type="text" id="edit-user-fullname" class="input-field" value="${u.full_name}" required>
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="edit-user-email" class="input-field" value="${u.email || ''}">
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input type="text" id="edit-user-phone" class="input-field" value="${u.phone || ''}">
          </div>
          <div class="form-group">
            <label>Role *</label>
            <select id="edit-user-role" class="input-field" required>
              <option value="cashier" ${u.role === 'cashier' ? 'selected' : ''}>Cashier / Accountant</option>
              <option value="manager" ${u.role === 'manager' ? 'selected' : ''}>Manager</option>
            </select>
          </div>
          <div class="form-group">
            <label>Branch</label>
            <select id="edit-user-branch" class="input-field">
              ${branchOptions}
            </select>
          </div>
          <div class="form-group">
            <label>New Password (leave blank to keep current)</label>
            <input type="password" id="edit-user-password" class="input-field" placeholder="New password (optional)">
          </div>
          <button type="submit" class="btn btn-primary w-full" style="background:#FF8C00;">Update User</button>
        </form>
      </div>`;

    document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        full_name: document.getElementById('edit-user-fullname').value.trim(),
        email: document.getElementById('edit-user-email').value.trim(),
        phone: document.getElementById('edit-user-phone').value.trim(),
        role: document.getElementById('edit-user-role').value,
      };
      const branchId = document.getElementById('edit-user-branch').value;
      if (branchId) data.branch = branchId;
      const password = document.getElementById('edit-user-password').value;
      if (password) data.password = password;

      try {
        await api.put(`/auth/users/${id}/`, data);
        modal.classList.add('hidden');
        loadUsers();
        showToast('User updated successfully!', 'success');
      } catch (err) {
        showToast(err.response?.data?.detail || 'Failed to update user', 'error');
      }
    });
  } catch (err) {
    showToast('Failed to load user details', 'error');
  }
}

async function deleteUser(id) {
  if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
    try {
      await api.delete(`/auth/users/${id}/`);
      loadUsers();
      showToast('User deleted', 'info');
    } catch (e) {
      showToast('Failed to delete user', 'error');
    }
  }
}