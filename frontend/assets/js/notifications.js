// ========== NOTIFICATIONS PAGE ==========
async function renderNotifications() {
  document.getElementById('main-content').innerHTML = `
    <div class="card" style="background: linear-gradient(135deg, #FF8C00, #FF5E7E); color:white; margin-bottom:20px;">
      <div class="flex-between">
        <h2><i class="fas fa-bell"></i> Notifications</h2>
        <button class="btn btn-sm" onclick="clearAllNotifications()" style="background:white; color:#FF5E7E;">
          <i class="fas fa-trash-alt"></i> Clear All
        </button>
      </div>
      <p style="opacity:0.9;">Stay updated with system alerts, low stock warnings, and daily summaries.</p>
    </div>
    <div id="notif-list"></div>
  `;
  loadNotifications();
}

async function loadNotifications() {
  try {
    const res = await api.get('/notifications/notifications/');
    const list = document.getElementById('notif-list');
    const notifications = res.data.results || [];

    if (notifications.length === 0) {
      list.innerHTML = '<div class="card text-center">No notifications yet.</div>';
      return;
    }

    list.innerHTML = notifications.map(n => {
      const isRead = n.is_read;
      const icon = getNotifIcon(n.type);
      const color = getNotifColor(n.type);
      return `
        <div class="notif-card" style="border-left: 5px solid ${color}; opacity:${isRead ? '0.6' : '1'}; transition:all 0.3s; margin-bottom:12px;">
          <div class="flex-between" style="padding:15px 20px;">
            <div style="display:flex; align-items:center; gap:15px;">
              <div style="font-size:1.5rem; color:${color};">${icon}</div>
              <div>
                <p style="margin:0; font-weight:600; ${isRead ? 'text-decoration:line-through;' : ''}">${n.message}</p>
                <small style="color:#718096;">${new Date(n.created_at).toLocaleString()}</small>
              </div>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
              <button class="btn btn-sm btn-outline" onclick="markAsRead('${n.id}')" ${isRead ? 'disabled' : ''} style="padding:4px 12px;">
                <i class="fas fa-check"></i> Read
              </button>
              <button class="btn btn-sm btn-accent" onclick="deleteNotification('${n.id}')" style="padding:4px 12px;">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    showToast('Failed to load notifications', 'error');
  }
}

function getNotifIcon(type) {
  const icons = {
    'system': '🔔',
    'low_stock': '📉',
    'daily_summary': '📊',
    'profit_alert': '💰',
  };
  return icons[type] || '📌';
}

function getNotifColor(type) {
  const colors = {
    'system': '#3182CE',
    'low_stock': '#E53E3E',
    'daily_summary': '#38A169',
    'profit_alert': '#DD6B20',
  };
  return colors[type] || '#718096';
}

async function markAsRead(id) {
  try {
    await api.patch(`/notifications/notifications/${id}/`, { is_read: true });
    loadNotifications();
    showToast('Marked as read', 'success');
  } catch (e) {
    showToast('Failed to update', 'error');
  }
}

async function deleteNotification(id) {
  if (!confirm('Delete this notification?')) return;
  try {
    await api.delete(`/notifications/notifications/${id}/`);
    loadNotifications();
    showToast('Deleted', 'info');
  } catch (e) {
    showToast('Failed to delete', 'error');
  }
}

async function clearAllNotifications() {
  if (!confirm('Delete all notifications? This cannot be undone.')) return;
  try {
    const res = await api.get('/notifications/notifications/');
    const notifications = res.data.results || [];
    // Delete each notification
    for (const n of notifications) {
      await api.delete(`/notifications/notifications/${n.id}/`);
    }
    loadNotifications();
    showToast('All notifications cleared', 'success');
  } catch (e) {
    showToast('Failed to clear notifications', 'error');
  }
}