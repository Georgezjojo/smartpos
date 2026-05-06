let refreshInterval;

async function renderDashboard() {
  document.getElementById('main-content').innerHTML = `
    <div class="dashboard-grid">
      <div class="card stat-card" onclick="window.location.hash='#/reports'" style="cursor:pointer;">
        <h4><i class="fas fa-coins"></i> Today's Sales</h4>
        <h2 id="daily-sales">...</h2>
      </div>
      <div class="card stat-card" onclick="window.location.hash='#/reports'" style="cursor:pointer;">
        <h4><i class="fas fa-calendar-week"></i> Weekly Sales</h4>
        <h2 id="weekly-sales">...</h2>
      </div>
      <div class="card stat-card" onclick="window.location.hash='#/inventory'" style="cursor:pointer;">
        <h4><i class="fas fa-exclamation-triangle"></i> Low Stock Items</h4>
        <h2 id="low-stock-count">...</h2>
      </div>
      <div class="card stat-card" onclick="window.location.hash='#/reports'" style="cursor:pointer;">
        <h4><i class="fas fa-chart-pie"></i> Profit (Monthly)</h4>
        <h2 id="profit-display">...</h2>
      </div>
    </div>
    <div class="card mt-20">
      <h3>Recent Sales</h3>
      <div id="recent-sales-table"></div>
      <div id="empty-sales" class="text-center mt-20 hidden"><i class="fas fa-receipt"></i> No sales yet.</div>
    </div>
    <div class="card mt-20" id="ai-insights" onclick="openAIWithInsights()" style="cursor:pointer;">
      <h3><i class="fas fa-robot"></i> AI Insights</h3>
      <div id="ai-content">Loading...</div>
    </div>
  `;
  loadDashboardData();
  clearInterval(refreshInterval);
  refreshInterval = setInterval(loadDashboardData, 60000);
}

async function loadDashboardData() {
  try {
    const summary = await getSalesSummary();
    const dailyEl = document.getElementById('daily-sales');
    const weeklyEl = document.getElementById('weekly-sales');
    const lowEl = document.getElementById('low-stock-count');
    if (dailyEl) dailyEl.textContent = `${summary.daily_sales} KES`;
    if (weeklyEl) weeklyEl.textContent = `${summary.weekly_sales} KES`;
    if (lowEl) lowEl.textContent = summary.low_stock_count || '0';
  } catch (e) { console.error(e); }

  try {
    const pl = await getProfitLoss();
    const profitEl = document.getElementById('profit-display');
    if (profitEl) profitEl.textContent = `${pl.profit} KES`;
  } catch (e) { console.error(e); }

  try {
    const recent = await getRecentSales();
    const table = document.getElementById('recent-sales-table');
    const emptyEl = document.getElementById('empty-sales');
    if (!table) return;
    if (recent.length === 0) {
      if (emptyEl) emptyEl.classList.remove('hidden');
      table.innerHTML = '';
    } else {
      if (emptyEl) emptyEl.classList.add('hidden');
      table.innerHTML = recent.map(s => `
        <div class="flex-between p-10" style="padding:10px; border-bottom:1px solid var(--border-light);">
          <span>${s.id.slice(0,8)}...</span>
          <span>${s.total_amount} KES</span>
          <span>${new Date(s.created_at).toLocaleTimeString()}</span>
        </div>
      `).join('');
    }
  } catch (e) { console.error(e); }

  // AI Insights
  try {
    const rec = await api.get('/ai/recommendations/');
    const aiDiv = document.getElementById('ai-content');
    if (!aiDiv) return;
    let html = '';
    if (rec.data.restock.length > 0) {
      html += '<h4>🔄 Restock Suggestions</h4><ul>';
      rec.data.restock.slice(0,3).forEach(p => html += `<li>${p.name} (stock: ${p.current_stock}, min: ${p.min_stock})</li>`);
      html += '</ul>';
    }
    if (rec.data.discontinue.length > 0) {
      html += '<h4>⚠️ Slow-moving Products (no sales in 60 days)</h4><ul>';
      rec.data.discontinue.slice(0,3).forEach(p => html += `<li>${p.name} (stock: ${p.stock})</li>`);
      html += '</ul>';
    }
    if (rec.data.restock.length === 0 && rec.data.discontinue.length === 0) {
      html = '<p>All products are performing well!</p>';
    }
    aiDiv.innerHTML = html;
  } catch (e) { console.error(e); }
}

function openAIWithInsights() {
  // Open the AI chat window if it exists
  const chatWin = document.getElementById('ai-chat-window');
  if (chatWin && chatWin.classList.contains('hidden')) {
    toggleAIChat();
  }
  // Pre‑fill a useful question
  setTimeout(() => {
    const aiInput = document.getElementById('ai-input');
    if (aiInput) {
      aiInput.value = 'What products should I restock?';
      aiInput.focus();
    }
  }, 300);
}