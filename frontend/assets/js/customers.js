// ========== CUSTOMERS PAGE ==========
async function renderCustomers() {
  document.getElementById('main-content').innerHTML = `
    <div class="card" style="background: linear-gradient(135deg, #6C5CE7, #FF8C00); color: white; margin-bottom: 20px;">
      <div class="flex-between">
        <h2><i class="fas fa-users"></i> Customer Management</h2>
        <button class="btn btn-sm" onclick="showAddCustomerModal()" 
                style="background: white; color: #6C5CE7; font-weight:700;">
          <i class="fas fa-plus"></i> Add Customer
        </button>
      </div>
      <p style="opacity:0.9;">View, edit, and manage your customer base.</p>
      <div style="margin-top:15px; position:relative;">
        <input type="text" id="customer-search" class="input-field" 
               placeholder="🔍 Search by name or phone..." 
               oninput="filterCustomerList()" 
               style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; width:100%;">
      </div>
    </div>

    <div id="customer-list" class="customer-grid"></div>
  `;
  await loadCustomerList();
}

// ---------- Load customer data ----------
async function loadCustomerList() {
  try {
    const res = await getCustomers();
    const customers = res.results || [];
    const grid = document.getElementById('customer-list');
    if (customers.length === 0) {
      grid.innerHTML = '<div class="card text-center">No customers yet. Click "Add Customer" to get started.</div>';
      return;
    }
    grid.innerHTML = customers.map(c => `
      <div class="customer-card" data-name="${c.name.toLowerCase()}" data-phone="${c.phone || ''}">
        <div class="customer-card-body">
          <div class="customer-avatar">
            <i class="fas fa-user-circle"></i>
          </div>
          <div class="customer-info">
            <h4>${c.name}</h4>
            ${c.phone ? `<small><i class="fas fa-phone"></i> ${c.phone}</small>` : ''}
            ${c.email ? `<small><i class="fas fa-envelope"></i> ${c.email}</small>` : ''}
          </div>
          <div class="customer-actions">
            <button class="btn btn-sm btn-outline" onclick="editCustomer('${c.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-accent" onclick="deleteCustomerPrompt('${c.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    showToast('Failed to load customers', 'error');
  }
}

// ---------- Search / Filter ----------
function filterCustomerList() {
  const query = document.getElementById('customer-search')?.value.toLowerCase() || '';
  document.querySelectorAll('.customer-card').forEach(card => {
    const name = card.dataset.name || '';
    const phone = card.dataset.phone || '';
    card.style.display = (name.includes(query) || phone.includes(query)) ? '' : 'none';
  });
}

// ---------- Add Customer Modal ----------
function showAddCustomerModal(customer = null) {
  const modal = document.getElementById('modal-overlay');
  modal.classList.remove('hidden');
  const isEdit = !!customer;
  const title = isEdit ? 'Edit Customer' : 'Add New Customer';
  modal.innerHTML = `
    <div class="modal-content" style="border-top: 4px solid #6C5CE7;">
      <h3 style="color:#6C5CE7;"><i class="fas fa-${isEdit ? 'edit' : 'plus-circle'}"></i> ${title}</h3>
      <form id="customer-form">
        <div class="form-group">
          <label>Full Name *</label>
          <input type="text" id="cust-name" class="input-field" value="${customer?.name || ''}" required>
        </div>
        <div class="form-group">
          <label>Phone Number</label>
          <input type="tel" id="cust-phone" class="input-field" value="${customer?.phone || ''}">
        </div>
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="cust-email" class="input-field" value="${customer?.email || ''}">
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea id="cust-notes" class="input-field" rows="3">${customer?.notes || ''}</textarea>
        </div>
        <button type="submit" class="btn btn-primary w-full" style="background:#6C5CE7;">
          <i class="fas fa-save"></i> ${isEdit ? 'Update Customer' : 'Save Customer'}
        </button>
      </form>
    </div>`;

  document.getElementById('customer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('cust-name').value,
      phone: document.getElementById('cust-phone').value,
      email: document.getElementById('cust-email').value,
      notes: document.getElementById('cust-notes').value
    };
    try {
      if (isEdit) {
        await api.put(`/sales/customers/${customer.id}/`, data);
        showToast('Customer updated', 'success');
      } else {
        await api.post('/sales/customers/', data);
        showToast('Customer added', 'success');
      }
      modal.classList.add('hidden');
      await loadCustomerList();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to save customer', 'error');
    }
  });
}

// ---------- Edit Customer ----------
async function editCustomer(id) {
  try {
    const res = await api.get(`/sales/customers/${id}/`);
    showAddCustomerModal(res.data);
  } catch (e) {
    showToast('Failed to load customer details', 'error');
  }
}

// ---------- Delete Customer ----------
async function deleteCustomerPrompt(id) {
  if (confirm('Are you sure you want to delete this customer?')) {
    try {
      await api.delete(`/sales/customers/${id}/`);
      await loadCustomerList();
      showToast('Customer deleted', 'info');
    } catch (e) {
      showToast('Failed to delete customer', 'error');
    }
  }
}