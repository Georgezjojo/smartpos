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

    <!-- Clickable Daily Insights Card -->
    <div class="card mt-20" id="daily-insights-card" onclick="showDailyInsightsModal()" style="cursor:pointer; transition: transform 0.3s ease, box-shadow 0.3s ease;"
         onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 16px 40px rgba(255,140,0,0.15)';"
         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='var(--shadow-md)';">
      <h3 style="display: flex; align-items: center; gap: 10px;">
        <i class="fas fa-envelope-open-text" style="color: #FF8C00;"></i>
        Daily Insights
        <span style="font-size: 0.8rem; color: #FF8C00; margin-left: auto;">→ Tap to expand</span>
      </h3>
      <div id="daily-insights-preview" style="margin-top: 15px;">Loading insights...</div>
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
  // Top stat cards
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

  // Recent sales table
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

  // AI Insights (in the dedicated card)
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

  // Daily Insights Preview (short text inside the clickable card)
  loadDailyInsightsPreview();
}

async function loadDailyInsightsPreview() {
  const previewDiv = document.getElementById('daily-insights-preview');
  if (!previewDiv) return;
  try {
    const [summary, profitLoss, aiRec] = await Promise.all([
      getSalesSummary().catch(() => ({ daily_sales: 0, weekly_sales: 0, low_stock_count: 0 })),
      getProfitLoss().catch(() => ({ profit: 0 })),
      api.get('/ai/recommendations/').catch(() => ({ data: { restock: [], discontinue: [] } }))
    ]);
    const recData = aiRec.data;
    let preview = '';
    preview += `<span style="color: #2D3436;">📊 <strong>${summary.daily_sales} KES</strong> today</span> &nbsp;`;
    if (summary.low_stock_count > 0) {
      preview += `<span style="color: #E53E3E;">⚠️ <strong>${summary.low_stock_count}</strong> low stock</span> &nbsp;`;
    } else {
      preview += `<span style="color: #38A169;">✅ All stocked</span> &nbsp;`;
    }
    if (recData.restock.length > 0 || recData.discontinue.length > 0) {
      preview += `<span style="color: #FF8C00;">🤖 Recommendations available</span>`;
    } else {
      preview += `<span style="color: #718096;">All products performing well</span>`;
    }
    previewDiv.innerHTML = preview;
  } catch (e) {
    previewDiv.innerHTML = '<span class="text-muted">Could not load preview</span>';
  }
}

async function showDailyInsightsModal() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  // Show loading state
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 800px; width: 95%; border-top: 4px solid #FF8C00; animation: fadeSlideUp 0.3s ease-out;">
      <div style="text-align: center; padding: 40px;">
        <i class="fas fa-spinner fa-pulse" style="font-size: 2rem; color: #FF8C00;"></i>
        <p style="margin-top: 15px;">Loading detailed insights...</p>
      </div>
    </div>
  `;
  overlay.classList.remove('hidden');

  // Fetch data
  let summary, profitLoss, aiRec;
  try {
    [summary, profitLoss, aiRec] = await Promise.all([
      getSalesSummary(),
      getProfitLoss(),
      api.get('/ai/recommendations/')
    ]);
  } catch (e) {
    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 500px; text-align: center;">
        <h3>❌ Error loading insights</h3>
        <p>${e.message}</p>
        <button class="btn btn-primary mt-20" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Close</button>
      </div>`;
    return;
  }

  const recData = aiRec.data;
  const lowStockCount = summary.low_stock_count || 0;

  const insightsHTML = `
    <div class="modal-content" style="max-width: 800px; width: 95%; border-top: 4px solid #FF8C00; animation: fadeSlideUp 0.3s ease-out;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
        <h2 style="color: #FF8C00; margin:0; font-size: 1.8rem;"><i class="fas fa-chart-bar"></i> Daily Insights</h2>
        <button class="btn btn-sm btn-outline" onclick="document.getElementById('modal-overlay').classList.add('hidden')" style="border-radius: 20px;">
          <i class="fas fa-times"></i> Close
        </button>
      </div>

      <!-- Financial Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 20px;">
        <div style="background: linear-gradient(135deg, #FF8C00, #FF5E7E); border-radius: 16px; padding: 20px; color: white; text-align: center;">
          <div style="font-size: 0.9rem; opacity: 0.9;">Today's Sales</div>
          <div style="font-size: 1.8rem; font-weight: 700;">${summary.daily_sales} KES</div>
        </div>
        <div style="background: linear-gradient(135deg, #6C5CE7, #A78BFA); border-radius: 16px; padding: 20px; color: white; text-align: center;">
          <div style="font-size: 0.9rem; opacity: 0.9;">Weekly Sales</div>
          <div style="font-size: 1.8rem; font-weight: 700;">${summary.weekly_sales} KES</div>
        </div>
        <div style="background: linear-gradient(135deg, ${profitLoss.profit >= 0 ? '#06D6A0' : '#E53E3E'}, #05B78A); border-radius: 16px; padding: 20px; color: white; text-align: center;">
          <div style="font-size: 0.9rem; opacity: 0.9;">Monthly Profit</div>
          <div style="font-size: 1.8rem; font-weight: 700;">${profitLoss.profit} KES</div>
        </div>
        <div style="background: linear-gradient(135deg, #718096, #4A5568); border-radius: 16px; padding: 20px; color: white; text-align: center;">
          <div style="font-size: 0.9rem; opacity: 0.9;">Low Stock Items</div>
          <div style="font-size: 1.8rem; font-weight: 700;">${lowStockCount}</div>
        </div>
      </div>

      <!-- Expense & Revenue Details -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
        <div class="card" style="margin:0; padding: 20px; text-align: center;">
          <div style="color: #718096; font-size: 0.9rem;">Total Revenue</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: #2D3436;">${profitLoss.revenue || 0} KES</div>
        </div>
        <div class="card" style="margin:0; padding: 20px; text-align: center;">
          <div style="color: #718096; font-size: 0.9rem;">Total Expenses</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: #2D3436;">${profitLoss.expenses || 0} KES</div>
        </div>
      </div>

      <!-- Low Stock Alert Section -->
      ${lowStockCount > 0 ? `
        <div class="card" style="margin-bottom: 20px; border-left: 4px solid #E53E3E; padding: 20px;">
          <h4 style="color: #E53E3E;"><i class="fas fa-exclamation-circle"></i> Low Stock Alert</h4>
          <p style="margin-top: 8px;">There are <strong>${lowStockCount}</strong> products that need to be restocked soon. Visit <a href="#/inventory" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Inventory</a> to see them.</p>
        </div>
      ` : `
        <div class="card" style="margin-bottom: 20px; border-left: 4px solid #38A169; padding: 20px;">
          <h4 style="color: #38A169;"><i class="fas fa-check-circle"></i> Stock Levels Healthy</h4>
          <p style="margin-top: 8px;">All your products are sufficiently stocked. Great job!</p>
        </div>
      `}

      <!-- AI Recommendations -->
      <div class="card" style="margin-bottom: 20px; padding: 20px;">
        <h4 style="color: #FF8C00;"><i class="fas fa-robot"></i> Smart Recommendations</h4>
        <div style="margin-top: 10px;">
          ${recData.restock.length > 0 ? `
            <div style="margin-bottom: 12px;">
              <strong>🔄 Restock Suggestions</strong>
              <ul style="margin-top: 5px; padding-left: 20px;">
                ${recData.restock.slice(0,3).map(p => `<li>${p.name} (stock: ${p.current_stock}, min: ${p.min_stock})</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          ${recData.discontinue.length > 0 ? `
            <div>
              <strong>⚠️ Slow-moving Products (no sales in 60 days)</strong>
              <ul style="margin-top: 5px; padding-left: 20px;">
                ${recData.discontinue.slice(0,3).map(p => `<li>${p.name} (stock: ${p.stock})</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          ${recData.restock.length === 0 && recData.discontinue.length === 0 ? '<p>All products are performing well!</p>' : ''}
        </div>
      </div>

      <!-- Footer note -->
      <div style="text-align: center; color: #718096; font-size: 0.9rem; margin-top: 10px;">
        <i class="fas fa-sync-alt"></i> Data refreshes every minute. <br>Click outside or the close button to dismiss.
      </div>
    </div>
  `;

  overlay.innerHTML = insightsHTML;
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