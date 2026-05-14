// ========== POINT OF SALE (Orange Payment Overlay) ==========
let cart = [];
let paymentMethod = 'cash';
let selectedCustomer = null;
let productsMap = {};
let customerMap = {};
let lastReceiptData = null;
let currentBranchId = null;
let currentBusinessId = null;
let currentUserRole = null;
let taxForcedOn = false;

// Pending sale state
let pendingSale = null;
let pendingPaymentInterval = null;

function formatMpesaPhone(phone) {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) cleaned = '254' + cleaned.slice(1);
  else if (cleaned.startsWith('7')) cleaned = '254' + cleaned;
  else if (cleaned.startsWith('1')) cleaned = '254' + cleaned;
  return cleaned;
}

// ---------- Connection status badge ----------
function updateOnlineStatus() {
  const badge = document.getElementById('online-status');
  if (!badge) return;
  if (navigator.onLine) {
    badge.innerHTML = '<span class="online-dot"></span> Online';
    badge.style.background = '#F97316';
    badge.style.color = 'white';
  } else {
    badge.innerHTML = '<span class="offline-dot"></span> Offline';
    badge.style.background = '#F97316';
    badge.style.color = 'white';
  }
}

// ---------- Business & Branch resolver ----------
async function getCurrentBranchAndBusiness() {
  if (currentBranchId && currentBusinessId) return { branchId: currentBranchId, businessId: currentBusinessId };
  try {
    const profile = await getProfile();
    currentBusinessId = profile.business?.id || profile.business;
    if (!currentBusinessId) {
      showToast('No business linked to your profile. Contact admin.', 'error');
      return null;
    }
    if (profile.branch) {
      currentBranchId = typeof profile.branch === 'object' ? profile.branch.id : profile.branch;
    } else {
      const res = await api.get('/business/branches/').catch(() => ({ data: { results: [] } }));
      const branches = res.data.results || res.data || [];
      if (branches.length > 0) {
        currentBranchId = branches[0].id;
      } else {
        showToast('No branch assigned. Please set up a branch in Settings.', 'error');
        return null;
      }
    }
    return { branchId: currentBranchId, businessId: currentBusinessId };
  } catch (e) {
    console.warn('Branch detection failed', e);
    showToast('Could not load profile. Please refresh.', 'error');
    return null;
  }
}

async function initUserAndTax() {
  try {
    const profile = await getProfile();
    currentUserRole = profile.role || 'cashier';
    taxForcedOn = (currentUserRole === 'cashier');
  } catch (e) {
    currentUserRole = 'cashier';
    taxForcedOn = true;
  }
}

// ---------- Render main POS ----------
async function renderPOS() {
  await initUserAndTax();
  await getCurrentBranchAndBusiness();

  document.getElementById('main-content').innerHTML = `
    <div style="display:flex; justify-content:flex-end; padding:6px 0;">
      <div id="online-status" style="padding:4px 12px; border-radius:20px; font-size:0.85rem; font-weight:600; display:inline-flex; align-items:center; gap:6px;">
      </div>
    </div>
    <div class="pos-container-new" style="max-width:1300px; margin:auto;">
      <div class="pos-left-new">
        <div class="card pos-card-new" style="border-top:4px solid #FF8C00;">
          <div class="pos-header-new">
            <h3 style="color:#FF8C00;"><i class="fas fa-boxes"></i> Products</h3>
            <div class="pos-search-wrapper" style="position:relative; flex:1; max-width:300px;">
              <input type="text" id="pos-search" class="input-field" placeholder="Search product..." oninput="filterPOS()">
              <i class="fas fa-search pos-search-icon" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); color:#A0AEC0;"></i>
            </div>
          </div>
          <div id="product-list" class="product-list-compact" style="overflow-y:auto; max-height:60vh;"></div>
        </div>
      </div>
      <div class="pos-right-new">
        <div class="card pos-card-new" style="border-top:4px solid #6C5CE7; display:flex; flex-direction:column; height:100%;">
          <div class="cart-header-new">
            <h3 style="color:#6C5CE7;"><i class="fas fa-shopping-cart"></i> Cart</h3>
            <button class="btn btn-sm btn-outline" onclick="clearCart()"><i class="fas fa-trash"></i> Clear</button>
          </div>
          <div id="cart-items-new" class="cart-items-new" style="flex:1; overflow-y:auto; max-height:40vh; padding-right:4px;"></div>
          <div class="cart-summary-new" style="font-size:0.95rem; color:#2D3436; margin-top:10px;">
            <div class="flex-between" style="margin-bottom:4px;">
              <span>Subtotal</span><strong id="cart-subtotal">0.00</strong>
            </div>
            <div class="flex-between" style="margin-bottom:4px; align-items:center;">
              <span>Discount (%)</span>
              <input type="number" id="discount-percent" class="input-field inline-input" value="0" min="0" max="100" onchange="updateCart()" style="width:70px; text-align:center;">
            </div>
            <div class="flex-between" style="margin-bottom:4px; color:#E53E3E; font-weight:600; font-size:0.95rem;">
              <span>💸 You Save</span><strong id="cart-discount">-0.00</strong>
            </div>
            <div class="flex-between" style="margin-bottom:4px; align-items:center;">
              <span>Tax (16%)</span>
              <input type="checkbox" id="tax-toggle" ${taxForcedOn ? 'checked disabled' : 'checked'} onchange="updateCart()">
              ${taxForcedOn ? '<small style="color:#718096;">(locked)</small>' : ''}
            </div>
            <div class="flex-between" style="margin-bottom:4px;">
              <span>Tax Amount</span><strong id="cart-tax">0.00</strong>
            </div>
            <hr style="margin:8px 0;">
            <div class="flex-between total-new" style="font-size:1.2rem; font-weight:700;">
              <strong>Total</strong><strong id="cart-total">0.00</strong>
            </div>
          </div>
          <div class="form-group mt-10">
            <label>Customer</label>
            <select id="customer-select" class="input-field" onchange="selectCustomer()">
              <option value="">👤 Walk‑in Customer</option>
            </select>
          </div>
          <div class="payment-methods-new mt-10">
            <label>Payment Method</label>
            <div class="flex gap-10">
              <button class="btn btn-payment-new active-payment" id="btn-cash" onclick="setPayment('cash')">💵 Cash</button>
              <button class="btn btn-payment-new" id="btn-card" onclick="setPayment('card')">💳 Card</button>
              <button class="btn btn-payment-new" id="btn-mpesa" onclick="setPayment('mpesa')">📱 M‑Pesa</button>
            </div>
          </div>
          <div class="flex gap-10" style="margin-top: 25px;">
            <button class="btn w-full" onclick="processSale()" id="pay-btn" disabled
                    style="background:#FF8C00; color:white; font-weight:700; border:none; padding:12px;">
              <i class="fas fa-check-circle"></i> Complete Sale
            </button>
            <button class="btn w-full" onclick="reprintLastReceipt()"
                    style="background:#FF8C00; color:white; font-weight:700; border:none; padding:12px;">
              <i class="fas fa-print"></i> Print Receipt
            </button>
          </div>
          <button class="btn btn-secondary w-full mt-10" id="sync-btn" onclick="syncSales()" style="display:none;">
            <i class="fas fa-cloud-upload-alt"></i> Sync Offline Sales
          </button>
        </div>
      </div>
    </div>
  `;

  await loadProducts();
  await loadCustomers();
  if (document.getElementById('discount-percent')) {
    updateCartDisplay();
  }
  updateOnlineStatus();
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  document.addEventListener('keydown', handlePOSKeys);
  checkPendingSync();
}

// ---------- Load products (single‑click adds) ----------
async function loadProducts() {
  try {
    if (navigator.onLine) {
      const res = await getProducts();
      productsMap = {};
      (res.results || []).forEach(p => { productsMap[p.id] = p; });
      await syncMasterData();
    } else {
      const localProducts = await db.products.toArray();
      productsMap = {};
      localProducts.forEach(p => {
        productsMap[p.id] = {
          id: p.id, name: p.name, price: p.price, stock_quantity: p.stock_quantity,
          discount_percent: p.discount_percent, discount_name: p.discount_name
        };
      });
    }
    const container = document.getElementById('product-list');
    const products = Object.values(productsMap);
    if (products.length === 0) {
      container.innerHTML = '<div class="text-center text-muted" style="padding:10px;">No products found.</div>';
      return;
    }
    container.innerHTML = `
      <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
        ${products.map(p => `
          <tr class="product-row" data-name="${p.name.toLowerCase()}" onclick="addToCart('${p.id}')" style="border-bottom:1px solid #E2E8F0; cursor:pointer;">
            <td style="padding:6px 8px;">${p.name}${p.discount_percent > 0 ? ` <span style="color:#E53E3E; font-size:0.7rem;">-${p.discount_percent}%</span>` : ''}</td>
            <td style="padding:6px 8px; text-align:right; font-weight:600;">${p.price} KES</td>
            <td style="padding:6px 4px; text-align:center;">
              <button class="btn btn-sm" onclick="event.stopPropagation(); addToCart('${p.id}')" style="background:#FF8C00; color:white; border:none; padding:2px 8px; border-radius:4px;">+ Add</button>
            </td>
          </tr>
        `).join('')}
      </table>
    `;
  } catch (e) { showToast('Failed to load products', 'error'); }
}

function filterPOS() {
  const query = document.getElementById('pos-search').value.toLowerCase();
  document.querySelectorAll('.product-row').forEach(row => row.style.display = row.dataset.name.includes(query) ? '' : 'none');
}

async function loadCustomers() {
  try {
    customerMap = {};
    if (navigator.onLine) {
      const res = await getCustomers();
      const select = document.getElementById('customer-select');
      res.results.forEach(c => {
        customerMap[c.id] = c;
        const opt = document.createElement('option');
        opt.value = c.id; opt.textContent = c.name; select.appendChild(opt);
      });
      await db.customers.clear();
      for (let c of res.results) await db.customers.put({ id: c.id, name: c.name, phone: c.phone || '', email: c.email || '' });
    } else {
      const localCustomers = await db.customers.toArray();
      const select = document.getElementById('customer-select');
      localCustomers.forEach(c => {
        customerMap[c.id] = c;
        const opt = document.createElement('option');
        opt.value = c.id; opt.textContent = c.name; select.appendChild(opt);
      });
    }
  } catch (e) {}
}

// ---------- Cart management ----------
function addToCart(productId) {
  const existing = cart.find(i => i.product_id === productId);
  if (existing) { existing.quantity++; }
  else {
    const product = productsMap[productId];
    if (!product) return;
    const originalPrice = parseFloat(product.price);
    const discountPercent = parseFloat(product.discount_percent) || 0;
    const discountedPrice = discountPercent > 0 ? originalPrice * (1 - discountPercent / 100) : originalPrice;
    cart.push({ product_id: productId, name: product.name, originalPrice, discountedPrice, discountPercent, discountName: product.discount_name || '', quantity: 1 });
  }
  updateCart();
}
function removeFromCart(productId) { cart = cart.filter(i => i.product_id !== productId); updateCart(); }
function changeQuantity(productId, delta) {
  const item = cart.find(i => i.product_id === productId);
  if (item) { item.quantity += delta; if (item.quantity <= 0) removeFromCart(productId); }
  updateCart();
}
function clearCart() { cart = []; updateCart(); removePaymentOverlay(); if (pendingPaymentInterval) { clearInterval(pendingPaymentInterval); pendingPaymentInterval = null; } pendingSale = null; }
function selectCustomer() { selectedCustomer = document.getElementById('customer-select').value || null; }
function setPayment(method) {
  paymentMethod = method;
  document.querySelectorAll('.btn-payment-new').forEach(b => b.classList.remove('active-payment'));
  document.getElementById(`btn-${method}`).classList.add('active-payment');
}

// ---------- Cart display (null‑safe) ----------
function updateCart() {
  const discountEl = document.getElementById('discount-percent');
  const taxCheckbox = document.getElementById('tax-toggle');
  const container = document.getElementById('cart-items-new');
  if (!discountEl || !taxCheckbox || !container) return;

  const discountPct = parseFloat(discountEl.value) || 0;
  if (taxForcedOn) taxCheckbox.checked = true;
  const applyTax = taxCheckbox.checked;

  let subtotal = 0, totalProductDiscount = 0, html = '';
  cart.forEach(item => {
    const lineOriginal = item.originalPrice * item.quantity;
    const lineDiscounted = item.discountedPrice * item.quantity;
    subtotal += lineDiscounted;
    totalProductDiscount += (lineOriginal - lineDiscounted);
    const hasDiscount = item.discountPercent > 0;
    html += `
      <div class="cart-item-compact" style="display:flex; align-items:center; justify-content:space-between; padding:6px 8px; border-bottom:1px solid #E2E8F0; font-size:0.9rem;">
        <div style="flex:1; display:flex; align-items:center; gap:8px;">
          <span style="font-weight:500;">${item.name}</span>
          ${hasDiscount ? `<span style="font-size:0.75rem; color:#E53E3E;">(-${item.discountPercent}%)</span>` : ''}
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <button class="btn btn-sm" onclick="changeQuantity('${item.product_id}', -1)" style="padding:1px 5px;">−</button>
          <span style="min-width:20px; text-align:center;">${item.quantity}</span>
          <button class="btn btn-sm" onclick="changeQuantity('${item.product_id}', 1)" style="padding:1px 5px;">+</button>
          <span style="min-width:70px; text-align:right; font-weight:600;">
            ${hasDiscount ? `<span style="text-decoration:line-through; color:#718096; margin-right:4px;">${lineOriginal.toFixed(2)}</span>` : ''}
            ${lineDiscounted.toFixed(2)}
          </span>
          <i class="fas fa-trash-alt" onclick="removeFromCart('${item.product_id}')" style="color:#E53E3E; cursor:pointer; font-size:0.85rem;"></i>
        </div>
      </div>
    `;
  });
  container.innerHTML = html || '<div class="text-center text-muted" style="padding:10px;">Cart is empty</div>';

  const manualDiscountAmount = subtotal * (discountPct / 100);
  const totalSavings = totalProductDiscount + manualDiscountAmount;
  const taxable = subtotal - manualDiscountAmount;
  const taxAmount = applyTax ? taxable * 0.16 : 0;
  const total = taxable + taxAmount;

  const cartSubtotalEl = document.getElementById('cart-subtotal');
  const cartDiscountEl = document.getElementById('cart-discount');
  const cartTaxEl = document.getElementById('cart-tax');
  const cartTotalEl = document.getElementById('cart-total');
  const payBtn = document.getElementById('pay-btn');

  if (cartSubtotalEl) cartSubtotalEl.textContent = subtotal.toFixed(2) + ' KES';
  if (cartDiscountEl) cartDiscountEl.textContent = '-' + totalSavings.toFixed(2) + ' KES';
  if (cartTaxEl) cartTaxEl.textContent = taxAmount.toFixed(2) + ' KES';
  if (cartTotalEl) cartTotalEl.textContent = total.toFixed(2) + ' KES';
  if (payBtn) payBtn.disabled = cart.length === 0;
}
function updateCartDisplay() { updateCart(); }

// ========== ORANGE PAYMENT OVERLAY (full screen) ==========
function showPaymentOverlay(innerHtml) {
  removePaymentOverlay();
  const overlay = document.createElement('div');
  overlay.id = 'pos-payment-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); z-index: 10000;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(4px); 
  `;
  const card = document.createElement('div');
  card.style.cssText = `
    background: white; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    max-width: 450px; width: 90%; max-height: 90vh; overflow-y: auto;
    border-top: 10px solid #FF8C00; position: relative; animation: fadeSlideUp 0.3s ease-out;
  `;
  card.innerHTML = innerHtml;
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function removePaymentOverlay() {
  const overlay = document.getElementById('pos-payment-overlay');
  if (overlay) overlay.remove();
}

// ---------- Process sale entry point ----------
async function processSale() {
  if (cart.length === 0) return;
  const total = parseFloat(document.getElementById('cart-total').textContent);
  if (!confirm(`Start sale for ${total.toFixed(2)} KES?`)) return;

  const discountValue = parseFloat(document.getElementById('cart-discount').textContent.replace('-','')) || 0;
  const taxAmount = parseFloat(document.getElementById('cart-tax').textContent) || 0;
  const subtotal = parseFloat(document.getElementById('cart-subtotal').textContent) || 0;

  const info = await getCurrentBranchAndBusiness();
  if (!info || !info.branchId || !info.businessId) {
    showToast('Cannot complete sale – branch or business missing.', 'error');
    return;
  }

  const saleData = {
    items: cart.map(i => ({ product: i.product_id, quantity: i.quantity })),
    discount: discountValue,
    payment_method: paymentMethod,
    customer: selectedCustomer || null,
    branch: info.branchId,
    business: info.businessId
  };

  pendingSale = { saleData, total, discount: discountValue, tax: taxAmount, subtotal, cartContents: [...cart] };

  if (paymentMethod === 'cash') {
    await finalizeSale(saleData);
  } else if (paymentMethod === 'mpesa' || paymentMethod === 'card') {
    const overlayHtml = `
      <div style="padding: 20px; font-family: 'Segoe UI', sans-serif;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="color: #FF8C00; margin:0; font-size:1.5rem;">📱 M‑Pesa Payment</h2>
          <button onclick="cancelPaymentOverlay()" style="background:none; border:none; font-size:24px; color:#777; cursor:pointer;">&times;</button>
        </div>
        <div style="background: #FFF4E6; border-radius:14px; padding:16px; text-align:center; margin-bottom:20px;">
          <p style="margin:0; color:#555;">Amount Due</p>
          <p style="font-size:2rem; font-weight:bold; color:#2D3436; margin:4px 0;">${total.toFixed(2)} KES</p>
        </div>
        <div class="form-group">
          <label style="color:#555; font-weight:600;">Customer Phone (07XX / 01XX)</label>
          <input type="tel" id="mpesa-phone" class="input-field" placeholder="07XX XXX XXX or 01XX XXX XXX" style="width:100%; padding:12px; border:1px solid #ddd; border-radius:10px; margin-top:6px;">
        </div>
        <button class="btn" onclick="sendSTKPush()" style="background:#FF8C00; color:white; width:100%; margin-top:18px; padding:14px; font-size:1rem; font-weight:bold; border:none; border-radius:12px;">
          <i class="fas fa-paper-plane"></i> Send Payment Request
        </button>
        <hr style="margin:22px 0; border-top:1px dashed #ccc;">
        <p style="text-align:center; color:#888; margin-bottom:10px;">Or confirm payment already received</p>
        <button class="btn" onclick="showManualConfirmInOverlay()" style="border:2px solid #FF8C00; color:#FF8C00; background:transparent; width:100%; padding:14px; border-radius:12px; font-weight:600;">
          🔍 Check Recent Payments
        </button>
        <div id="payment-status-msg" style="text-align:center; margin-top:18px; font-weight:600; font-size:0.9rem;"></div>
      </div>
    `;
    showPaymentOverlay(overlayHtml);
    document.getElementById('pay-btn').disabled = true;
    document.getElementById('pay-btn').innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Awaiting Payment';
  }
}

// ---------- Cancel overlay (without finalizing) ----------
function cancelPaymentOverlay() {
  removePaymentOverlay();
  if (pendingPaymentInterval) { clearInterval(pendingPaymentInterval); pendingPaymentInterval = null; }
  pendingSale = null;
  document.getElementById('pay-btn').disabled = cart.length === 0;
  document.getElementById('pay-btn').innerHTML = '<i class="fas fa-check-circle"></i> Complete Sale';
  showToast('Payment cancelled.', 'info');
}

// ---------- STK Push logic ----------
async function sendSTKPush() {
  if (!pendingSale) return;
  const phoneInput = document.getElementById('mpesa-phone').value.trim();
  if (!phoneInput) { showToast('Please enter the customer phone number', 'error'); return; }

  const phone = formatMpesaPhone(phoneInput);
  if (!phone.startsWith('254')) {
    showToast('Invalid phone number. Please use 07... or 01... format.', 'error');
    return;
  }

  const total = pendingSale.total;
  const reference = `POS-${Date.now()}`;
  const statusDiv = document.getElementById('payment-status-msg');
  statusDiv.innerHTML = '<span style="color:#FF8C00;">⏳ Sending payment request...</span>';

  try {
    const result = await initiateMpesaSTK(phone, total, reference);
    statusDiv.innerHTML = '<span style="color:#FF8C00;">⏳ Waiting for customer PIN...</span>';
    startPaymentPolling(result.checkout_request_id);
  } catch (e) {
    statusDiv.innerHTML = '<span style="color:#E53E3E;">❌ STK Push failed. Try manual confirmation.</span>';
    showToast('STK Push failed: ' + (e.response?.data?.detail || e.message), 'error');
  }
}

function startPaymentPolling(checkoutRequestId) {
  if (pendingPaymentInterval) clearInterval(pendingPaymentInterval);
  let attempts = 0;
  pendingPaymentInterval = setInterval(async () => {
    attempts++;
    try {
      const status = await checkMpesaStatus(checkoutRequestId);
      if (status.status === 'Success') {
        clearInterval(pendingPaymentInterval);
        pendingPaymentInterval = null;
        document.getElementById('payment-status-msg').innerHTML = '<span style="color:#38A169;">✅ Payment received!</span>';
        removePaymentOverlay();
        await finalizeSale(pendingSale.saleData);
      } else if (status.status === 'Failed' || attempts > 15) {
        clearInterval(pendingPaymentInterval);
        pendingPaymentInterval = null;
        document.getElementById('payment-status-msg').innerHTML = '<span style="color:#E53E3E;">❌ Payment failed or timeout.</span>';
      }
    } catch (e) {}
  }, 4000);
}

// ---------- Manual confirmation inside overlay ----------
function showManualConfirmInOverlay() {
  if (!pendingSale) return;
  const overlay = document.getElementById('pos-payment-overlay');
  if (!overlay) return;
  const card = overlay.querySelector('div');
  card.innerHTML = `
    <div style="padding:20px; font-family: 'Segoe UI', sans-serif;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="color:#FF8C00; margin:0;">📋 Confirm Payment</h2>
        <button onclick="cancelPaymentOverlay()" style="background:none; border:none; font-size:24px; color:#777; cursor:pointer;">&times;</button>
      </div>
      <div style="background:#FFF4E6; border-radius:14px; padding:16px; text-align:center; margin-bottom:20px;">
        <p style="margin:0; color:#555;">Amount Pending</p>
        <p style="font-size:2rem; font-weight:bold; color:#2D3436; margin:4px 0;">${pendingSale.total.toFixed(2)} KES</p>
      </div>
      <div id="recent-payments-list" class="recent-payments" style="max-height:300px; overflow-y:auto; margin-bottom:20px;">
        <p class="text-muted">Loading recent payments...</p>
      </div>
      <button class="btn" onclick="markAsPaidManually()" style="background:#FF8C00; color:white; width:100%; padding:14px; border:none; border-radius:12px; font-weight:bold;">
        ✅ Mark as Paid Anyway
      </button>
      <button class="btn" onclick="showMPesaMainOverlay()" style="border:2px solid #FF8C00; color:#FF8C00; background:transparent; width:100%; margin-top:10px; padding:12px; border-radius:12px;">
        ← Back
      </button>
    </div>
  `;
  loadRecentPayments();
}

async function loadRecentPayments() {
  try {
    const res = await api.get('/payments/recent/');
    const payments = res.data.results || [];
    const container = document.getElementById('recent-payments-list');
    if (payments.length === 0) {
      container.innerHTML = '<p class="text-muted">No recent unconfirmed payments.</p>';
      return;
    }
    container.innerHTML = payments.map(p => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #eee;">
        <span>${p.phone} - ${p.amount} KES</span>
        <button class="btn btn-sm" onclick="confirmMatchedPayment(${p.id})" style="background:#FF8C00; color:white; border:none; border-radius:6px; padding:4px 12px;">Confirm</button>
      </div>
    `).join('');
  } catch (e) {}
}

async function confirmMatchedPayment(paymentId) {
  try {
    await api.post(`/payments/${paymentId}/confirm/`);
    removePaymentOverlay();
    await finalizeSale(pendingSale.saleData);
  } catch (e) {
    showToast('Confirmation failed: ' + (e.response?.data?.detail || e.message), 'error');
  }
}

async function markAsPaidManually() {
  removePaymentOverlay();
  await finalizeSale(pendingSale.saleData);
}

function showMPesaMainOverlay() {
  if (!pendingSale) return;
  const overlayHtml = `
    <div style="padding: 20px; font-family: 'Segoe UI', sans-serif;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="color: #FF8C00; margin:0;">📱 M‑Pesa Payment</h2>
        <button onclick="cancelPaymentOverlay()" style="background:none; border:none; font-size:24px; color:#777; cursor:pointer;">&times;</button>
      </div>
      <div style="background: #FFF4E6; border-radius:14px; padding:16px; text-align:center; margin-bottom:20px;">
        <p style="margin:0; color:#555;">Amount Due</p>
        <p style="font-size:2rem; font-weight:bold; color:#2D3436; margin:4px 0;">${pendingSale.total.toFixed(2)} KES</p>
      </div>
      <div class="form-group">
        <label style="color:#555; font-weight:600;">Customer Phone (07XX / 01XX)</label>
        <input type="tel" id="mpesa-phone" class="input-field" placeholder="07XX XXX XXX or 01XX XXX XXX" style="width:100%; padding:12px; border:1px solid #ddd; border-radius:10px; margin-top:6px;">
      </div>
      <button class="btn" onclick="sendSTKPush()" style="background:#FF8C00; color:white; width:100%; margin-top:18px; padding:14px; font-size:1rem; font-weight:bold; border:none; border-radius:12px;">
        <i class="fas fa-paper-plane"></i> Send Payment Request
      </button>
      <hr style="margin:22px 0; border-top:1px dashed #ccc;">
      <p style="text-align:center; color:#888; margin-bottom:10px;">Or confirm payment already received</p>
      <button class="btn" onclick="showManualConfirmInOverlay()" style="border:2px solid #FF8C00; color:#FF8C00; background:transparent; width:100%; padding:14px; border-radius:12px; font-weight:600;">
        🔍 Check Recent Payments
      </button>
      <div id="payment-status-msg" style="text-align:center; margin-top:18px; font-weight:600; font-size:0.9rem;"></div>
    </div>
  `;
  const overlay = document.getElementById('pos-payment-overlay');
  if (overlay) {
    const card = overlay.querySelector('div');
    card.innerHTML = overlayHtml;
  }
}

// ---------- API stubs ----------
async function initiateMpesaSTK(phone, amount, reference) {
  const res = await api.post('/payments/mpesa/stkpush/', { phone, amount, account_reference: reference });
  return res.data;
}
async function checkMpesaStatus(checkoutRequestId) {
  const res = await api.get(`/payments/mpesa/status/?checkout_request_id=${checkoutRequestId}`);
  return res.data;
}

// ---------- Finalize sale ----------
async function finalizeSale(saleData) {
  removePaymentOverlay();
  if (pendingPaymentInterval) { clearInterval(pendingPaymentInterval); pendingPaymentInterval = null; }
  const payBtn = document.getElementById('pay-btn');
  payBtn.disabled = true;
  payBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Completing...';

  try {
    if (navigator.onLine) {
      await createSale(saleData);
      showToast('Sale completed!', 'success');
    } else {
      await queueOfflineSale(saleData);
      showToast('Sale queued offline.', 'info');
    }

    const businessInfo = await getBusinessAndCashierInfo();
    const customerName = selectedCustomer && customerMap[selectedCustomer] ? customerMap[selectedCustomer].name : 'Walk‑in';

    lastReceiptData = {
      items: pendingSale.cartContents,
      total: pendingSale.total,
      discount: pendingSale.discount,
      tax: pendingSale.tax,
      subtotal: pendingSale.subtotal,
      paymentMethod,
      businessInfo,
      customerName,
      date: new Date()
    };

    cart = [];
    selectedCustomer = null;
    pendingSale = null;
    updateCart();
    printReceipt(lastReceiptData);
  } catch (e) {
    const detail = e.response?.data ? (typeof e.response.data === 'string' ? e.response.data : JSON.stringify(e.response.data)) : e.message;
    console.error('Sale error:', e.response?.data || e);
    showToast(`Sale failed: ${detail}`, 'error');
  } finally {
    payBtn.disabled = false;
    payBtn.innerHTML = '<i class="fas fa-check-circle"></i> Complete Sale';
    checkPendingSync();
  }
}

// ---------- Business & cashier info ----------
async function getBusinessAndCashierInfo() {
  try {
    const [businessRes, userRes] = await Promise.all([
      api.get('/settings/').catch(() => ({ data: {} })),
      api.get('/users/profile/').catch(() => ({ data: {} }))
    ]);
    return {
      businessName: businessRes.data.business_name || businessRes.data.name || 'SmartPOS',
      businessAddress: businessRes.data.address || '',
      businessPhone: businessRes.data.phone || '',
      cashierName: userRes.data.full_name || userRes.data.username || 'Cashier'
    };
  } catch { return { businessName: 'SmartPOS', businessAddress: '', businessPhone: '', cashierName: 'Cashier' }; }
}

// ---------- Reprint & receipt ----------
function reprintLastReceipt() {
  if (!lastReceiptData) { showToast('No receipt to print.', 'info'); return; }
  printReceipt(lastReceiptData);
}

function printReceipt(data) {
  const { items, total, discount, tax, subtotal, paymentMethod: pm, businessInfo, customerName, date } = data;
  const paymentMethodLabel = { cash: '💵 Cash', card: '💳 Card', mpesa: '📱 M‑Pesa' }[pm] || pm;
  const receiptHTML = `
    <div style="font-family: 'Courier New', monospace; width: 80mm; margin:0 auto; padding:10px; font-size:11px; color:#000;">
      <div style="text-align:center; margin-bottom:8px;">
        <h2 style="margin:0; font-size:16px; font-weight:bold;">${businessInfo.businessName}</h2>
        ${businessInfo.businessAddress ? `<p style="margin:0; font-size:10px;">${businessInfo.businessAddress}</p>` : ''}
        ${businessInfo.businessPhone ? `<p style="margin:0; font-size:10px;">Tel: ${businessInfo.businessPhone}</p>` : ''}
        <p style="margin:4px 0 0; font-size:10px;">${date.toLocaleDateString()} ${date.toLocaleTimeString()}</p>
        <p style="margin:0; font-size:10px;">Cashier: ${businessInfo.cashierName}</p>
        <p style="margin:0; font-size:10px;">Customer: ${customerName}</p>
      </div>
      <hr style="border-top:1px dashed #000; margin:6px 0;">
      <table style="width:100%; border-collapse:collapse; font-size:11px;">
        <thead><tr style="border-bottom:1px solid #000;"><th style="text-align:left;">Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Each</th><th style="text-align:right;">Total</th></tr></thead>
        <tbody>
          ${items.map(item => {
            const lineDiscounted = item.discountedPrice * item.quantity;
            const lineOriginal = item.originalPrice * item.quantity;
            const showOriginal = item.discountPercent > 0;
            return `<tr>
              <td>${item.name}${showOriginal ? ' <span style="font-size:9px;color:red;">(-' + item.discountPercent + '%)</span>' : ''}</td>
              <td style="text-align:center;">${item.quantity}</td>
              <td style="text-align:right;">${showOriginal ? `<span style="text-decoration:line-through; font-size:9px;">${item.originalPrice.toFixed(2)}</span><br>` : ''}${item.discountedPrice.toFixed(2)}</td>
              <td style="text-align:right;">${lineDiscounted.toFixed(2)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <hr style="border-top:1px dashed #000; margin:6px 0;">
      <div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
      ${discount > 0 ? `<div style="display:flex; justify-content:space-between; color:#E53E3E;"><span>Discount</span><span>-${discount.toFixed(2)}</span></div>` : ''}
      ${tax > 0 ? `<div style="display:flex; justify-content:space-between;"><span>Tax (16%)</span><span>${tax.toFixed(2)}</span></div>` : ''}
      <div style="display:flex; justify-content:space-between; font-weight:bold; margin-top:4px; border-top:1px solid #000; padding-top:2px;"><span>Total</span><span>${total.toFixed(2)}</span></div>
      <div style="margin-top:6px; border-top:1px dashed #000; padding-top:4px;">
        <div style="display:flex; justify-content:space-between; font-weight:bold;"><span>${paymentMethodLabel}</span><span>${total.toFixed(2)}</span></div>
      </div>
      <div style="text-align:center; margin-top:10px; font-size:10px;">
        <p style="margin:0;">Thank you for your purchase!</p>
        <p style="margin:2px 0;">---</p>
        <p style="margin:0;">Powered by SmartPOS</p>
      </div>
    </div>`;
  const w = window.open('', '', 'width=400,height=600');
  w.document.write(`<html><head><title>Receipt</title></head><body>${receiptHTML}</body></html>`);
  w.document.close();
  w.print();
}

// ---------- Offline sync ----------
async function checkPendingSync() {
  const count = await getOfflineSalesCount();
  const btn = document.getElementById('sync-btn');
  if (btn) {
    btn.style.display = count > 0 ? 'inline-block' : 'none';
    btn.innerHTML = `<i class="fas fa-cloud-upload-alt"></i> Sync Offline Sales (${count})`;
  }
}
async function syncSales() {
  showToast('Syncing offline sales...', 'info');
  const result = await syncOfflineSales();
  if (result.failed > 0) showToast(`Sync completed: ${result.synced} successful, ${result.failed} failed.`, 'error');
  else showToast(`All ${result.synced} offline sales synced!`, 'success');
  checkPendingSync();
}

// ---------- Keyboard shortcuts ----------
function handlePOSKeys(e) {
  if (e.ctrlKey && e.key === 'k') { e.preventDefault(); document.getElementById('pos-search').focus(); }
  if (e.key === 'F2') setPayment('cash');
  if (e.key === 'F3') setPayment('card');
  if (e.key === 'F4') setPayment('mpesa');
  if (e.key === 'Escape') clearCart();
}