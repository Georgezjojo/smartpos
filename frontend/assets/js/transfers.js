// ========== STOCK TRANSFERS ==========
async function renderTransfers() {
  document.getElementById('main-content').innerHTML = `
    <div class="card" style="background: linear-gradient(135deg, #6C5CE7, #00A3C4); color: white; margin-bottom: 20px;">
      <div class="flex-between">
        <h2><i class="fas fa-exchange-alt"></i> Stock Transfers</h2>
        <button class="btn btn-sm" onclick="showAddTransferModal()" style="background: white; color: #6C5CE7; font-weight:700;">
          <i class="fas fa-plus"></i> New Transfer
        </button>
      </div>
      <p style="opacity:0.9;">Move inventory between branches effortlessly.</p>
    </div>
    <div id="transfer-list"></div>
  `;
  loadTransfers();
}

async function loadTransfers() {
  try {
    const res = await api.get('/inventory/transfers/');
    const list = document.getElementById('transfer-list');
    const transfers = res.data.results || [];
    if (transfers.length === 0) {
      list.innerHTML = '<div class="card text-center">No transfers recorded yet. Click "New Transfer" to get started.</div>';
      return;
    }
    list.innerHTML = transfers.map(t => `
      <div class="transfer-card">
        <div class="transfer-card-body">
          <div class="transfer-product">
            <i class="fas fa-box"></i> <strong>${t.product_name || 'Unknown Product'}</strong>
            <span class="transfer-qty">${t.quantity} units</span>
          </div>
          <div class="transfer-branches">
            <span class="from-branch">${t.from_branch_name || 'Source'}</span>
            <i class="fas fa-arrow-right transfer-arrow"></i>
            <span class="to-branch">${t.to_branch_name || 'Destination'}</span>
          </div>
          <div class="flex-between mt-10">
            <small class="transfer-date">📅 ${new Date(t.created_at).toLocaleString()}</small>
            ${t.reason ? `<small class="transfer-reason">📝 ${t.reason}</small>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    showToast('Failed to load transfers', 'error');
  }
}

async function showAddTransferModal() {
  // Fetch branches and products for dropdowns
  let branchOptions = '<option value="">-- Select Branch --</option>';
  let productOptions = '<option value="">-- Select Product --</option>';
  try {
    const branchRes = await api.get('/business/branches/');
    (branchRes.data.results || []).forEach(b => {
      branchOptions += `<option value="${b.id}">${b.name} (${b.location})</option>`;
    });
  } catch (e) {
    branchOptions = '<option value="">Failed to load branches</option>';
  }
  try {
    const prodRes = await api.get('/inventory/products/');
    (prodRes.data.results || []).forEach(p => {
      productOptions += `<option value="${p.id}">${p.name} (SKU: ${p.sku})</option>`;
    });
  } catch (e) {
    productOptions = '<option value="">Failed to load products</option>';
  }

  const modal = document.getElementById('modal-overlay');
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <div class="modal-content" style="max-width:500px; border-top: 4px solid #6C5CE7;">
      <h3 style="color:#6C5CE7;"><i class="fas fa-exchange-alt"></i> New Stock Transfer</h3>
      <form id="add-transfer-form">
        <div class="form-group">
          <label>From Branch *</label>
          <select id="transfer-from-branch" class="input-field" required>${branchOptions}</select>
        </div>
        <div class="form-group">
          <label>To Branch *</label>
          <select id="transfer-to-branch" class="input-field" required>${branchOptions}</select>
        </div>
        <div class="form-group">
          <label>Product *</label>
          <select id="transfer-product" class="input-field" required>${productOptions}</select>
        </div>
        <div class="form-group">
          <label>Quantity *</label>
          <input type="number" id="transfer-quantity" class="input-field" placeholder="No. of units" min="1" required>
        </div>
        <div class="form-group">
          <label>Reason (optional)</label>
          <input type="text" id="transfer-reason" class="input-field" placeholder="e.g., Restock branch">
        </div>
        <button type="submit" class="btn btn-primary w-full" style="background:#6C5CE7;">
          <i class="fas fa-paper-plane"></i> Transfer Stock
        </button>
      </form>
    </div>`;

  document.getElementById('add-transfer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fromBranch = document.getElementById('transfer-from-branch').value;
    const toBranch = document.getElementById('transfer-to-branch').value;
    const product = document.getElementById('transfer-product').value;
    const quantity = document.getElementById('transfer-quantity').value;
    const reason = document.getElementById('transfer-reason').value;

    if (fromBranch === toBranch) {
      showToast('Source and destination branches cannot be the same.', 'error');
      return;
    }

    const data = {
      from_branch: fromBranch,
      to_branch: toBranch,
      product: product,
      quantity: parseInt(quantity),
      reason: reason,
    };

    const btn = document.querySelector('#add-transfer-form button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Transferring...';

    try {
      await api.post('/inventory/transfers/', data);
      modal.classList.add('hidden');
      loadTransfers();
      showToast('Stock transferred successfully!', 'success');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Transfer failed. Check stock levels.';
      showToast(msg, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Transfer Stock';
    }
  });
}