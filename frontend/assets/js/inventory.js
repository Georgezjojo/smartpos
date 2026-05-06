// ========== INVENTORY PAGE ==========
async function renderInventory() {
  document.getElementById('main-content').innerHTML = `
    <!-- Header Banner -->
    <div class="card" style="background: linear-gradient(135deg, #6C5CE7, #FF8C00); color: white; margin-bottom: 20px;">
      <div class="flex-between">
        <h2><i class="fas fa-boxes"></i> Inventory Management</h2>
        <button class="btn btn-sm" onclick="showAddProductModal()" 
                style="background: white; color: #6C5CE7; font-weight:700;">
          <i class="fas fa-plus"></i> Add Product
        </button>
      </div>
      <p style="opacity:0.9;">Manage your products, stock levels, discounts, and images.</p>
      <div style="margin-top:15px; position:relative;">
        <input type="text" id="inventory-search" class="input-field" 
               placeholder="🔍 Search by name or SKU..." 
               oninput="filterInventory()" 
               style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; width:100%;">
      </div>
    </div>
    <div id="product-grid" class="product-grid-inv"></div>
  `;
  await loadInventory();
}

// ---------- Load products ----------
async function loadInventory() {
  try {
    const res = await getProducts();
    const products = res.results || [];
    const grid = document.getElementById('product-grid');
    if (products.length === 0) {
      grid.innerHTML = '<div class="card text-center">No products found. Click "Add Product" to get started.</div>';
      return;
    }
    grid.innerHTML = products.map(p => `
      <div class="inv-product-card" data-sku="${p.sku}" data-name="${p.name}">
        <div class="inv-card-img" style="background-image: url(${p.image ? p.image : ''}); background-size: cover; background-position: center; display:flex; align-items:center; justify-content:center; font-size:2rem; height:100px; border-radius:12px 12px 0 0;">
          ${!p.image ? '📦' : ''}
        </div>
        <div class="inv-card-body">
          <h4>${p.name}</h4>
          <small style="color:#718096;">SKU (Stock Keeping Unit): ${p.sku}</small>
          <div class="flex-between mt-10">
            <span style="font-weight:700; color: var(--primary);">${p.price} KES</span>
            <span class="stock-badge ${p.stock_quantity <= p.min_stock ? 'low-stock' : 'in-stock'}">
              ${p.stock_quantity || 0} in stock
            </span>
          </div>
          ${p.pack_size > 1 ? `<div style="margin-top:5px; font-size:0.8rem; color:#718096;">📦 1 carton = ${p.pack_size} pieces</div>` : ''}
          ${p.discount_percent > 0 ? `<div style="margin-top:5px;"><span class="product-discount-badge">🏷️ ${p.discount_name || 'Discount'}: -${p.discount_percent}%</span></div>` : ''}
          <div class="flex-between mt-10">
            <button class="btn btn-sm btn-outline" onclick="editProduct('${p.id}')"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn btn-sm btn-accent" onclick="deleteProductPrompt('${p.id}')"><i class="fas fa-trash"></i> Delete</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) { showToast('Failed to load inventory', 'error'); }
}

// ---------- Filter ----------
function filterInventory() {
  const query = document.getElementById('inventory-search').value.toLowerCase();
  document.querySelectorAll('.inv-product-card').forEach(card => {
    const name = card.dataset.name.toLowerCase();
    const sku = card.dataset.sku.toLowerCase();
    card.style.display = (name.includes(query) || sku.includes(query)) ? '' : 'none';
  });
}

// ---------- Add Product Modal (with robust initial stock handling) ----------
function showAddProductModal() {
  const modal = document.getElementById('modal-overlay');
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <div class="modal-content" style="border-top: 4px solid #6C5CE7;">
      <h3 style="color:#6C5CE7;"><i class="fas fa-plus-circle"></i> Add New Product</h3>
      <form id="add-product-form" enctype="multipart/form-data">
        <div class="form-group">
          <label>Product Name *</label>
          <input type="text" id="prod-name" class="input-field" placeholder="e.g., Coca Cola 500ml" required>
        </div>
        <div class="form-group">
          <label>SKU (Stock Keeping Unit) *</label>
          <input type="text" id="prod-sku" class="input-field" placeholder="Unique product code" required>
        </div>
        <div class="form-group">
          <label>Selling Price (KES) *</label>
          <input type="number" id="prod-price" class="input-field" placeholder="Price customers pay" step="0.01" required>
        </div>
        <div class="form-group">
          <label>Cost Price (KES) *</label>
          <input type="number" id="prod-cost" class="input-field" placeholder="How much you bought it for" step="0.01" required>
        </div>
        <div class="form-group">
          <label>Pieces per Carton</label>
          <input type="number" id="prod-pack-size" class="input-field" placeholder="How many pieces in one carton? (default 1)" value="1" min="1">
        </div>
        <div class="form-group">
          <label>Initial Cartons in Stock</label>
          <input type="number" id="prod-cartons" class="input-field" placeholder="Number of cartons you have" value="0" min="0">
        </div>
        <div class="form-group">
          <label>Minimum Stock Level</label>
          <input type="number" id="prod-min-stock" class="input-field" placeholder="Alert when stock goes below this" value="5">
        </div>
        <div class="form-group">
          <label>Discount (%)</label>
          <input type="number" id="prod-discount-percent" class="input-field" placeholder="Automatic discount on this product (0‑100)" step="0.01" value="0">
        </div>
        <div class="form-group">
          <label>Discount Name</label>
          <input type="text" id="prod-discount-name" class="input-field" placeholder="e.g., 'Summer Sale 10%'">
        </div>
        <div class="form-group">
          <label>Product Image</label>
          <input type="file" id="prod-image" class="input-field" accept="image/*">
        </div>
        <button type="submit" class="btn btn-primary w-full" style="background:#6C5CE7;">Save Product</button>
      </form>
    </div>`;

  // --- Robust initial stock handler (single listener) ---
  document.getElementById('add-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const packSize = parseInt(document.getElementById('prod-pack-size').value) || 1;
    const cartons = parseInt(document.getElementById('prod-cartons').value) || 0;
    const initialStock = cartons * packSize;

    const formData = new FormData();
    formData.append('name', document.getElementById('prod-name').value);
    formData.append('sku', document.getElementById('prod-sku').value);
    formData.append('price', document.getElementById('prod-price').value);
    formData.append('cost', document.getElementById('prod-cost').value);
    formData.append('pack_size', packSize);
    formData.append('min_stock', parseInt(document.getElementById('prod-min-stock').value) || 5);
    formData.append('discount_percent', parseFloat(document.getElementById('prod-discount-percent').value) || 0);
    formData.append('discount_name', document.getElementById('prod-discount-name').value);
    const imageFile = document.getElementById('prod-image').files[0];
    if (imageFile) formData.append('image', imageFile);

    try {
      const productRes = await createProductWithImage(formData);
      const productId = productRes.id;   // Assumes the API returns the full product object

      if (initialStock > 0) {
        // Safely set initial stock – try to update existing record first, then create
        const profile = await getProfile();
        const branchId = profile.branch || null;   // current user's branch
        if (branchId) {
          try {
            // 1. Check if a stock record already exists for this product+branch
            const stockRes = await api.get('/inventory/stock/', {
              params: { product: productId, branch: branchId }
            });
            if (stockRes.data.results && stockRes.data.results.length > 0) {
              // 2a. Update existing stock (add to current quantity)
              const existing = stockRes.data.results[0];
              await api.put(`/inventory/stock/${existing.id}/`, {
                ...existing,
                quantity: existing.quantity + initialStock
              });
            } else {
              // 2b. Create new stock record
              await api.post('/inventory/stock/', {
                product: productId,
                branch: branchId,
                quantity: initialStock
              });
            }
          } catch (stockErr) {
            // If GET fails (maybe the endpoint doesn't support filtering), fallback to POST
            try {
              await api.post('/inventory/stock/', {
                product: productId,
                branch: branchId,
                quantity: initialStock
              });
            } catch (postErr) {
              console.warn('Could not set initial stock – please add manually.', postErr);
            }
          }
        }
      }

      modal.classList.add('hidden');
      await loadInventory();
      showToast('Product added successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to add product', 'error');
    }
  });
}

// ---------- Edit Product Modal ----------
async function editProduct(id) {
  try {
    const res = await api.get(`/inventory/products/${id}/`);
    const p = res.data;
    const modal = document.getElementById('modal-overlay');
    modal.classList.remove('hidden');
    modal.innerHTML = `
      <div class="modal-content" style="border-top: 4px solid #6C5CE7;">
        <h3 style="color:#6C5CE7;"><i class="fas fa-edit"></i> Edit Product</h3>
        <form id="edit-product-form" enctype="multipart/form-data">
          <div class="form-group">
            <label>Product Name *</label>
            <input type="text" id="edit-prod-name" class="input-field" value="${p.name}" required>
          </div>
          <div class="form-group">
            <label>SKU (Stock Keeping Unit) *</label>
            <input type="text" id="edit-prod-sku" class="input-field" value="${p.sku}" required>
          </div>
          <div class="form-group">
            <label>Selling Price (KES) *</label>
            <input type="number" id="edit-prod-price" class="input-field" step="0.01" value="${p.price}" required>
          </div>
          <div class="form-group">
            <label>Cost Price (KES) *</label>
            <input type="number" id="edit-prod-cost" class="input-field" step="0.01" value="${p.cost}" required>
          </div>
          <div class="form-group">
            <label>Pieces per Carton</label>
            <input type="number" id="edit-prod-pack-size" class="input-field" value="${p.pack_size || 1}" min="1">
          </div>
          <div class="form-group">
            <label>Minimum Stock Level</label>
            <input type="number" id="edit-prod-min-stock" class="input-field" value="${p.min_stock}">
          </div>
          <div class="form-group">
            <label>Discount (%)</label>
            <input type="number" id="edit-prod-discount-percent" class="input-field" step="0.01" value="${p.discount_percent || 0}">
          </div>
          <div class="form-group">
            <label>Discount Name</label>
            <input type="text" id="edit-prod-discount-name" class="input-field" value="${p.discount_name || ''}">
          </div>
          <div class="form-group">
            <label>Product Image</label>
            <input type="file" id="edit-prod-image" class="input-field" accept="image/*">
            ${p.image ? `<img src="${p.image}" style="max-width:100px; margin-top:5px; border-radius:8px;">` : ''}
          </div>
          <button type="submit" class="btn btn-primary w-full" style="background:#6C5CE7;">Update Product</button>
        </form>
      </div>`;

    document.getElementById('edit-product-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append('name', document.getElementById('edit-prod-name').value);
      formData.append('sku', document.getElementById('edit-prod-sku').value);
      formData.append('price', document.getElementById('edit-prod-price').value);
      formData.append('cost', document.getElementById('edit-prod-cost').value);
      formData.append('pack_size', parseInt(document.getElementById('edit-prod-pack-size').value) || 1);
      formData.append('min_stock', parseInt(document.getElementById('edit-prod-min-stock').value) || 5);
      formData.append('discount_percent', parseFloat(document.getElementById('edit-prod-discount-percent').value) || 0);
      formData.append('discount_name', document.getElementById('edit-prod-discount-name').value);
      const imageFile = document.getElementById('edit-prod-image').files[0];
      if (imageFile) formData.append('image', imageFile);

      try {
        await updateProductWithImage(id, formData);
        modal.classList.add('hidden');
        await loadInventory();
        showToast('Product updated successfully!', 'success');
      } catch (err) {
        showToast(err.response?.data?.detail || 'Failed to update product', 'error');
      }
    });
  } catch (err) {
    showToast('Failed to load product details', 'error');
  }
}

// ---------- Delete Product ----------
async function deleteProductPrompt(id) {
  if (confirm('Are you sure you want to delete this product?')) {
    try {
      await deleteProduct(id);
      await loadInventory();
      showToast('Product deleted', 'info');
    } catch (e) {
      showToast('Failed to delete product', 'error');
    }
  }
}