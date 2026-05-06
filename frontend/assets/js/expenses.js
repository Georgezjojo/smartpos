// ========== EXPENSES PAGE ==========
async function renderExpenses() {
  document.getElementById('main-content').innerHTML = `
    <div class="card" style="background: linear-gradient(135deg, #FF8C00, #FF5E7E); color: white; margin-bottom: 20px;">
      <div class="flex-between">
        <h2><i class="fas fa-receipt"></i> Expenses</h2>
        <button class="btn btn-sm" onclick="showAddExpenseModal()" style="background: white; color: #FF5E7E;">
          <i class="fas fa-plus"></i> Add Expense
        </button>
      </div>
      <p style="opacity:0.9;">Track all business costs to monitor profit and spending.</p>
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
      list.innerHTML = '<div class="card text-center">No expenses recorded yet. Click "Add Expense" to begin.</div>';
      return;
    }

    list.innerHTML = expenses.map(e => {
      const categoryColor = getCategoryColor(e.category);
      return `
        <div class="expense-card" style="border-left: 5px solid ${categoryColor};">
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
          <input type="text" id="expense-category" class="input-field" placeholder="Category (e.g., Rent, Salaries)" required>
        </div>
        <div class="form-group">
          <input type="number" id="expense-amount" class="input-field" placeholder="Amount (KES)" step="0.01" required>
        </div>
        <div class="form-group">
          <input type="text" id="expense-desc" class="input-field" placeholder="Description (optional)">
        </div>
        <div class="form-group">
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
      category: document.getElementById('expense-category').value,
      amount: document.getElementById('expense-amount').value,
      description: document.getElementById('expense-desc').value,
      date: document.getElementById('expense-date').value,
    };
    try {
      await api.post('/expenses/expenses/', data);
      modal.classList.add('hidden');
      loadExpenses();
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
      loadExpenses();
      showToast('Expense deleted', 'info');
    } catch (e) {
      showToast('Failed to delete expense', 'error');
    }
  }
}