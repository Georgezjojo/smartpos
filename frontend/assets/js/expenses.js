// ========== EXPENSES PAGE ==========
async function renderExpenses() {
  document.getElementById('main-content').innerHTML = `
    <div class="card" style="background: linear-gradient(135deg, #FF8C00, #FF5E7E); color: white; margin-bottom: 20px;">
      <div class="flex-between">
        <h2><i class="fas fa-receipt"></i> Expenses</h2>
        <button class="btn btn-sm" onclick="showAddExpenseModal()" style="background: white; color: #FF5E7E; font-weight:700;">
          <i class="fas fa-plus"></i> Add Expense
        </button>
      </div>
      <p style="opacity:0.9;">Track all business costs to monitor profit and spending.</p>
      <div style="margin-top:15px; position:relative;">
        <input type="text" id="expense-search" class="input-field" 
               placeholder="🔍 Search by category or description..." 
               oninput="filterExpenses()" 
               style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; width:100%;">
      </div>
    </div>
    <div id="expense-list"></div>
  `;
  loadExpenses();
}

async function loadExpenses() {
  try {
    const res = await api.get('/expenses/expenses/');
    const list = document.getElementById('expense-list');
    const expenses = res.data.results || [];

    if (expenses.length === 0) {
      list.innerHTML = '<div class="card text-center"><i class="fas fa-receipt" style="font-size:2rem; color:#718096;"></i><p>No expenses recorded yet. Click "Add Expense" to begin.</p></div>';
      return;
    }

    // Store full dataset for filtering
    window._expensesData = expenses;

    list.innerHTML = expenses.map(e => {
      const categoryColor = getCategoryColor(e.category);
      return `
        <div class="expense-card" data-category="${e.category.toLowerCase()}" data-desc="${(e.description || '').toLowerCase()}" style="border-left: 5px solid ${categoryColor};">
          <div class="expense-card-body">
            <div class="flex-between">
              <div>
                <span class="expense-category" style="background:${categoryColor}; color:white; padding:2px 12px; border-radius:12px; font-size:0.8rem; font-weight:600;">${e.category}</span>
                <strong style="margin-left:10px;">${e.amount} KES</strong>
              </div>
              <span style="color:#718096; font-size:0.9rem;">${e.date}</span>
            </div>
            ${e.description ? `<p style="margin:8px 0 0; color:#4A5568;">${e.description}</p>` : ''}
            <div style="margin-top:10px;">
              <button class="btn btn-sm btn-accent" onclick="deleteExpense('${e.id}')"><i class="fas fa-trash"></i> Delete</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    showToast('Failed to load expenses', 'error');
  }
}

function filterExpenses() {
  const query = document.getElementById('expense-search')?.value.toLowerCase() || '';
  document.querySelectorAll('.expense-card').forEach(card => {
    const category = card.dataset.category;
    const desc = card.dataset.desc;
    card.style.display = (category.includes(query) || desc.includes(query)) ? '' : 'none';
  });
}

function getCategoryColor(category) {
  const colors = {
    'rent': '#E53E3E',
    'salaries': '#DD6B20',
    'utilities': '#3182CE',
    'inventory': '#38A169',
    'marketing': '#805AD5',
  };
  return colors[category.toLowerCase()] || '#718096';
}

function showAddExpenseModal() {
  const modal = document.getElementById('modal-overlay');
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <div class="modal-content">
      <h3 style="color:#FF8C00;"><i class="fas fa-plus-circle"></i> Add Expense</h3>
      <form id="add-expense-form">
        <div class="form-group">
          <label>Category *</label>
          <input type="text" id="expense-category" class="input-field" placeholder="e.g., Rent, Salaries" required>
        </div>
        <div class="form-group">
          <label>Amount (KES) *</label>
          <input type="number" id="expense-amount" class="input-field" placeholder="0.00" step="0.01" required>
        </div>
        <div class="form-group">
          <label>Description</label>
          <input type="text" id="expense-desc" class="input-field" placeholder="Optional note">
        </div>
        <div class="form-group">
          <label>Date *</label>
          <input type="date" id="expense-date" class="input-field" required>
        </div>
        <button type="submit" class="btn btn-primary w-full" style="background:#FF8C00;">Save Expense</button>
      </form>
    </div>`;

  // Set default date to today
  document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];

  document.getElementById('add-expense-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      category: document.getElementById('expense-category').value.trim(),
      amount: document.getElementById('expense-amount').value,
      description: document.getElementById('expense-desc').value.trim(),
      date: document.getElementById('expense-date').value,
    };
    if (!data.category || !data.amount || !data.date) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    try {
      await api.post('/expenses/expenses/', data);
      modal.classList.add('hidden');
      await loadExpenses();
      showToast('Expense added successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to add expense', 'error');
    }
  });
}

async function deleteExpense(id) {
  if (confirm('Are you sure you want to delete this expense?')) {
    try {
      await api.delete(`/expenses/expenses/${id}/`);
      await loadExpenses();
      showToast('Expense deleted', 'info');
    } catch (e) {
      showToast('Failed to delete expense', 'error');
    }
  }
}