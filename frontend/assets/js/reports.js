// ========== REPORTS DASHBOARD (with branch filter, date pickers, download) ==========
let selectedBranch = '';

function renderReports() {
  document.getElementById('main-content').innerHTML = `
    <div class="card" style="background: linear-gradient(135deg, #FF8C00, #FF5E7E); color: white; margin-bottom: 20px;">
      <h2><i class="fas fa-chart-bar"></i> Financial Reports</h2>
      <p style="opacity:0.9;">Comprehensive business intelligence – filter by branch.</p>
    </div>

    <div class="card report-card">
      <div class="flex-between" style="flex-wrap:wrap; gap:10px;">
        <h4 style="color:#FF8C00;"><i class="fas fa-code-branch"></i> Filter by Branch</h4>
        <select id="branch-select" class="input-field" onchange="onBranchChange()" style="max-width:250px;">
          <option value="">🌐 All Branches</option>
        </select>
      </div>
    </div>

    <div class="report-grid">
      ${createReportCard('Profit & Loss', '💰', '#38A169', 'profitLossReport')}
      ${createReportCard('Sales Report', '📊', '#3182CE', 'salesReport')}
      ${createReportCard('Inventory Report', '📦', '#DD6B20', 'inventoryReport')}
      ${createReportCard('Expense Report', '💸', '#E53E3E', 'expenseReport')}
      ${createReportCard('Product Performance', '🏆', '#805AD5', 'productPerformance')}
      ${createReportCard('Branch Performance', '🏢', '#2B6CB0', 'branchPerformance')}
      ${createReportCard('Balance Sheet', '⚖️', '#2F855A', 'balanceSheet')}
      ${createReportCard('Cash Flow', '💧', '#00A3C4', 'cashFlow')}
      ${createReportCard('Customer Report', '👥', '#D53F8C', 'customerReport')}
      ${createReportCard('Sales Trend (30d)', '📈', '#6C5CE7', 'salesTrend')}
    </div>
  `;

  loadBranchDropdown();
  document.querySelectorAll('.report-card-clickable').forEach(card => {
    card.addEventListener('click', function() {
      openReportModal(this.dataset.report);
    });
  });
}

function createReportCard(title, icon, color, reportType) {
  return `
    <div class="report-card-clickable" data-report="${reportType}" style="border-left: 5px solid ${color}; cursor:pointer;">
      <div style="display:flex; align-items:center; gap:15px;">
        <span style="font-size:2rem;">${icon}</span>
        <h4 style="margin:0;">${title}</h4>
      </div>
      <p style="margin-top:10px; color:#718096; font-size:0.9rem;">Click to view &rarr;</p>
    </div>
  `;
}

async function loadBranchDropdown() {
  try {
    const res = await getBranches();
    const select = document.getElementById('branch-select');
    (res.results || []).forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name;
      select.appendChild(opt);
    });
  } catch (e) {}
}

function onBranchChange() {
  selectedBranch = document.getElementById('branch-select').value;
}

function branchQueryParam() {
  return selectedBranch ? `?branch_id=${selectedBranch}` : '';
}

// ---------- Report Modal (with date pickers and download) ----------
async function openReportModal(reportType) {
  const modal = document.getElementById('modal-overlay');
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <div class="modal-content report-modal-content" style="max-width:1000px; max-height:90vh; overflow-y:auto;">
      <div class="flex-between mb-20">
        <h3 style="color:#FF8C00;" id="report-modal-title">${getReportTitle(reportType)}</h3>
        <div class="flex gap-10">
          <button class="btn btn-sm btn-outline" onclick="downloadReport('${reportType}')"><i class="fas fa-download"></i> Download CSV</button>
          <i class="fas fa-times" onclick="document.getElementById('modal-overlay').classList.add('hidden')" style="cursor:pointer; font-size:1.4rem; color:#718096;"></i>
        </div>
      </div>

      <!-- Date filters -->
      <div class="flex gap-20 mb-20" style="flex-wrap:wrap;">
        <input type="date" id="report-start" class="input-field" style="flex:1; min-width:150px;">
        <input type="date" id="report-end" class="input-field" style="flex:1; min-width:150px;">
        <button class="btn btn-primary" onclick="refreshReport('${reportType}')" style="background:#FF8C00;">Apply</button>
      </div>

      <div id="report-content">
        <p class="text-center">Loading…</p>
      </div>
    </div>`;

  await refreshReport(reportType);
}

function getReportTitle(type) {
  const titles = {
    profitLossReport: 'Profit & Loss', salesReport: 'Sales Report', inventoryReport: 'Inventory Report',
    expenseReport: 'Expense Report', productPerformance: 'Product Performance', branchPerformance: 'Branch Performance',
    balanceSheet: 'Balance Sheet', cashFlow: 'Cash Flow', customerReport: 'Customer Report', salesTrend: 'Sales Trend (30 Days)',
  };
  return titles[type] || 'Report';
}

function getDateParams() {
  const start = document.getElementById('report-start')?.value;
  const end = document.getElementById('report-end')?.value;
  let params = branchQueryParam();
  if (start) params += (params ? '&' : '?') + `start=${start}`;
  if (end) params += (params ? '&' : '?') + `end=${end}`;
  return params;
}

async function refreshReport(reportType) {
  const params = getDateParams();
  let html = '';
  try {
    switch(reportType) {
      case 'profitLossReport': html = await getProfitLossHTML(params); break;
      case 'salesReport': html = await getSalesReportHTML(params); break;
      case 'inventoryReport': html = await getInventoryReportHTML(params); break;
      case 'expenseReport': html = await getExpenseReportHTML(params); break;
      case 'productPerformance': html = await getProductPerformanceHTML(params); break;
      case 'branchPerformance': html = await getBranchPerformanceHTML(params); break;
      case 'balanceSheet': html = await getBalanceSheetHTML(params); break;
      case 'cashFlow': html = await getCashFlowHTML(params); break;
      case 'customerReport': html = await getCustomerReportHTML(params); break;
      case 'salesTrend': html = await getSalesTrendHTML(params); break;
    }
  } catch (e) { html = '<p class="text-center">Error loading report.</p>'; }
  document.getElementById('report-content').innerHTML = html;
}

function downloadReport(type) {
  const params = getDateParams();
  window.open(`http://localhost:8000/api/reports/export/${type}/${params}`, '_blank');
}

// ---------- Individual Report HTML Loaders (with charts & formulas) ----------

async function getProfitLossHTML(params) {
  const res = await api.get(`/reports/profit-loss/${params}`);
  const d = res.data;
  return `
    <div class="summary-result">
      <div class="summary-item"><span>💰 Total Sales</span><strong>${d.total_sales} KES</strong></div>
      <div class="summary-item"><span>💸 Total Expenses</span><strong>${d.total_expenses} KES</strong></div>
      <div class="summary-item"><span>📈 Net Profit</span><strong style="color:${d.profit>=0?'#38A169':'#E53E3E'}">${d.profit} KES</strong></div>
    </div>
    <div class="calculation-box">
      <h4>🧮 Formula</h4>
      <p>Profit = Total Sales − Total Expenses</p>
      <p>${d.total_sales} − ${d.total_expenses} = <strong>${d.profit} KES</strong></p>
    </div>
    <canvas id="profitLossChart" height="200"></canvas>
    <script>
      new Chart(document.getElementById('profitLossChart').getContext('2d'), {
        type: 'bar', data: { labels: ['Sales Revenue', 'Total Expenses'], datasets: [{ data: [${d.total_sales}, ${d.total_expenses}], backgroundColor: ['#38A169','#E53E3E'] }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    </script>`;
}

async function getSalesReportHTML(params) {
  const res = await api.get(`/sales/sales/?limit=50${selectedBranch ? '&branch_id='+selectedBranch : ''}`);
  const sales = res.data.results || [];
  if (!sales.length) return '<p>No sales yet.</p>';
  let table = '<table class="report-table"><thead><tr><th>ID</th><th>Date</th><th>Customer</th><th>Total</th><th>Payment</th></tr></thead><tbody>';
  sales.forEach(s => table += `<tr><td>${s.id.slice(0,8)}</td><td>${new Date(s.created_at).toLocaleDateString()}</td><td>${s.customer||'Walk-in'}</td><td>${s.total_amount} KES</td><td>${s.payment_method}</td></tr>`);
  table += '</tbody></table>';
  return table;
}

async function getInventoryReportHTML(params) {
  const res = await api.get(`/reports/inventory/${params}`);
  const items = res.data || [];
  if (!items.length) return '<p>No inventory data.</p>';
  let table = '<table class="report-table"><thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Value</th><th>Status</th></tr></thead><tbody>';
  items.forEach(i => table += `<tr><td>${i.name}</td><td>${i.sku}</td><td>${i.quantity}</td><td>${i.total_value}</td><td>${i.low_stock?'🔴 Low':'🟢 OK'}</td></tr>`);
  table += '</tbody></table>';
  return table;
}

async function getExpenseReportHTML(params) {
  const res = await api.get(`/reports/expenses-report/${params}`);
  const d = res.data;
  let html = `<div class="summary-result"><div class="summary-item"><span>Total Expenses</span><strong>${d.total} KES</strong></div></div>`;
  if (d.by_category.length) {
    const labels = d.by_category.map(c => c.category);
    const values = d.by_category.map(c => c.total);
    html += '<canvas id="expenseChart" height="250"></canvas>';
    html += `<script>
      new Chart(document.getElementById('expenseChart').getContext('2d'), {
        type: 'doughnut',
        data: { labels: ${JSON.stringify(labels)}, datasets: [{ data: ${JSON.stringify(values)}, backgroundColor: ['#E53E3E','#DD6B20','#3182CE','#38A169','#805AD5','#D53F8C','#00A3C4'] }] },
        options: { responsive: true }
      });
    </script>`;
  }
  return html;
}

async function getProductPerformanceHTML(params) {
  const res = await api.get(`/reports/product-performance/${params}`);
  const data = res.data || [];
  if (!data.length) return '<p>No sales data.</p>';
  let table = '<table class="report-table"><thead><tr><th>Product</th><th>SKU</th><th>Sold</th><th>Revenue</th><th>Profit</th></tr></thead><tbody>';
  data.forEach(p => table += `<tr><td>${p.product}</td><td>${p.sku}</td><td>${p.quantity_sold}</td><td>${p.revenue}</td><td>${p.profit}</td></tr>`);
  table += '</tbody></table>';
  const labels = data.slice(0,5).map(p => p.product);
  const profits = data.slice(0,5).map(p => p.profit);
  return table + `<canvas id="productPerfChart" height="200"></canvas>
    <script>
      new Chart(document.getElementById('productPerfChart').getContext('2d'), {
        type: 'bar', data: { labels: ${JSON.stringify(labels)}, datasets: [{ label: 'Profit (KES)', data: ${JSON.stringify(profits)}, backgroundColor: '#805AD5' }] },
        options: { responsive: true }
      });
    </script>`;
}

async function getBranchPerformanceHTML(params) {
  const res = await api.get(`/reports/branch-performance/${params}`);
  const data = res.data || [];
  if (!data.length) return '<p>No branches.</p>';
  let table = '<table class="report-table"><thead><tr><th>Branch</th><th>Sales</th><th>Expenses</th><th>Profit</th><th>Orders</th></tr></thead><tbody>';
  data.forEach(b => table += `<tr><td>${b.branch}</td><td>${b.sales}</td><td>${b.expenses}</td><td>${b.profit}</td><td>${b.orders}</td></tr>`);
  table += '</tbody></table>';
  const labels = data.map(b => b.branch);
  const profits = data.map(b => b.profit);
  return table + `<canvas id="branchChart" height="200"></canvas>
    <script>
      new Chart(document.getElementById('branchChart').getContext('2d'), {
        type: 'bar', data: { labels: ${JSON.stringify(labels)}, datasets: [{ label: 'Profit (KES)', data: ${JSON.stringify(profits)}, backgroundColor: '#2B6CB0' }] },
        options: { responsive: true }
      });
    </script>`;
}

async function getBalanceSheetHTML(params) {
  const res = await api.get(`/reports/balance-sheet/${params}`);
  const d = res.data;
  return `
    <div class="summary-result">
      <div class="summary-item"><span>📦 Inventory (Assets)</span><strong>${d.assets.inventory} KES</strong></div>
      <div class="summary-item"><span>💵 Cash</span><strong>${d.assets.cash} KES</strong></div>
      <div class="summary-item"><span>🏦 Total Assets</span><strong>${d.assets.total} KES</strong></div>
      <div class="summary-item"><span>📉 Liabilities</span><strong>${d.liabilities} KES</strong></div>
      <div class="summary-item"><span>📈 Equity</span><strong>${d.equity} KES</strong></div>
    </div>
    <div class="calculation-box">
      <h4>🧮 Formula</h4>
      <p>Equity = Assets − Liabilities</p>
      <p>${d.assets.total} − ${d.liabilities} = <strong>${d.equity} KES</strong></p>
    </div>
    <canvas id="balanceChart" height="200"></canvas>
    <script>
      new Chart(document.getElementById('balanceChart').getContext('2d'), {
        type: 'bar', data: { labels: ['Inventory','Cash'], datasets: [{ data: [${d.assets.inventory}, ${d.assets.cash}], backgroundColor: ['#2F855A','#38A169'] }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    </script>`;
}

async function getCashFlowHTML(params) {
  const res = await api.get(`/reports/cash-flow/${params}`);
  const d = res.data;
  return `
    <div class="summary-result">
      <div class="summary-item"><span>💧 Operating Cash Flow</span><strong>${d.operating} KES</strong></div>
      <div class="summary-item"><span>💰 Net Cash Change</span><strong>${d.net_change} KES</strong></div>
    </div>
    <div class="calculation-box"><h4>🧮 How it’s calculated</h4><p>Net Cash = Total Sales − Total Expenses (assumed collected/paid)</p></div>
    <canvas id="cashFlowChart" height="150"></canvas>
    <script>
      new Chart(document.getElementById('cashFlowChart').getContext('2d'), {
        type: 'bar', data: { labels: ['Net Cash Flow'], datasets: [{ data: [${d.operating}], backgroundColor: ${d.operating>=0?"'#38A169'":"'#E53E3E'"} }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    </script>`;
}

async function getCustomerReportHTML(params) {
  const res = await api.get(`/reports/customer-report/${params}`);
  const data = res.data || [];
  if (!data.length) return '<p>No customers.</p>';
  let table = '<table class="report-table"><thead><tr><th>Name</th><th>Phone</th><th>Purchases</th><th>Total Spent</th></tr></thead><tbody>';
  data.forEach(c => table += `<tr><td>${c.name}</td><td>${c.phone||'-'}</td><td>${c.total_purchases}</td><td>${c.total_spent}</td></tr>`);
  table += '</tbody></table>';
  const labels = data.slice(0,5).map(c => c.name);
  const spent = data.slice(0,5).map(c => c.total_spent);
  return table + `<canvas id="customerChart" height="200"></canvas>
    <script>
      new Chart(document.getElementById('customerChart').getContext('2d'), {
        type: 'bar', data: { labels: ${JSON.stringify(labels)}, datasets: [{ label: 'Total Spent (KES)', data: ${JSON.stringify(spent)}, backgroundColor: '#D53F8C' }] },
        options: { responsive: true }
      });
    </script>`;
}

async function getSalesTrendHTML(params) {
  const res = await api.get(`/reports/trends/${params}`);
  const data = res.data;
  if (!data.length) return '<p>No sales data available.</p>';
  const labels = data.map(d => d.date);
  const totals = data.map(d => d.total);
  const totalSum = totals.reduce((a,b)=>a+b,0);
  const avg = (totalSum / totals.length).toFixed(2);
  return `
    <div class="summary-result">
      <div class="summary-item"><span>📅 Period Total</span><strong>${totalSum} KES</strong></div>
      <div class="summary-item"><span>📊 Daily Average</span><strong>${avg} KES</strong></div>
    </div>
    <canvas id="modalLineChart" height="300"></canvas>
    <script>
      new Chart(document.getElementById('modalLineChart').getContext('2d'), {
        type: 'line',
        data: { labels: ${JSON.stringify(labels)}, datasets: [{ label: 'Daily Sales (KES)', data: ${JSON.stringify(totals)}, borderColor: '#6C5CE7', backgroundColor: 'rgba(108,92,231,0.1)', fill: true, tension: 0.4 }] },
        options: { responsive: true, plugins: { tooltip: { callbacks: { label: ctx => ctx.raw + ' KES' } } } }
      });
    </script>`;
}

// CSV Export
async function exportReport(type) {
  const params = getDateParams();
  try {
    const response = await api.get(`/reports/export/${type}/${params}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${type}_report.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (e) {
    showToast('Export failed', 'error');
  }
}

// Period Summary Generator
async function loadPeriodSummary() {
  const start = document.getElementById('period-start')?.value;
  const end = document.getElementById('period-end')?.value;
  if (!start || !end) {
    showToast('Please select both start and end dates', 'error');
    return;
  }
  const params = `?start=${start}&end=${end}${selectedBranch ? '&branch_id=' + selectedBranch : ''}`;
  try {
    const res = await api.get(`/reports/period-summary/${params}`);
    const resultDiv = document.getElementById('period-result');
    if (resultDiv) {
      resultDiv.innerHTML = `
        <div class="summary-result">
          <div class="summary-item"><span>📅 Period</span><strong>${start} → ${end}</strong></div>
          <div class="summary-item"><span>💰 Total Sales</span><strong>${res.data.total_sales} KES</strong></div>
          <div class="summary-item"><span>💸 Total Expenses</span><strong>${res.data.total_expenses} KES</strong></div>
          <div class="summary-item"><span>📈 Net Profit</span><strong style="color:${res.data.profit >= 0 ? '#38A169' : '#E53E3E'};">${res.data.profit} KES</strong></div>
        </div>
        <div class="calculation-box">
          <h4>🧮 Formula</h4>
          <p>Profit = Total Sales − Total Expenses</p>
          <p>${res.data.total_sales} − ${res.data.total_expenses} = <strong>${res.data.profit} KES</strong></p>
        </div>
      `;
    }
  } catch (e) {
    showToast('Failed to load period summary. Check your dates.', 'error');
  }
}