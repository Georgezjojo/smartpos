// ========== AI ASSISTANT (Floating Widget) ==========
(function () {
  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Do not create the floating bubble if we're already on the full AI page
    if (document.body.getAttribute('data-page') === 'ai') return;

    // ---- Create floating action button ----
    const fab = document.createElement('div');
    fab.id = 'ai-fab';
    fab.innerHTML = '<i class="fas fa-robot"></i>';
    Object.assign(fab.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: '9999',
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      background: '#FF8C00',
      color: 'white',
      fontSize: '26px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 14px rgba(255,140,0,0.4)',
      cursor: 'pointer',
      transition: 'transform 0.2s',
    });
    fab.onmouseenter = () => (fab.style.transform = 'scale(1.1)');
    fab.onmouseleave = () => (fab.style.transform = 'scale(1)');
    document.body.appendChild(fab);

    // ---- Create chat modal ----
    const modal = document.createElement('div');
    modal.id = 'ai-chat-modal';
    Object.assign(modal.style, {
      position: 'fixed',
      bottom: '100px',
      right: '24px',
      zIndex: '9998',
      width: '360px',
      maxHeight: '500px',
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
      display: 'none',
      flexDirection: 'column',
      overflow: 'hidden',
      borderTop: '4px solid #FF8C00',
    });
    modal.innerHTML = `
      <div style="background:#FF8C00;color:white;padding:12px 16px;font-weight:bold;display:flex;justify-content:space-between;align-items:center;">
        <span><i class="fas fa-robot"></i> SmartPOS Assistant</span>
        <button id="ai-close-btn" style="background:none;border:none;color:white;font-size:20px;cursor:pointer;">&times;</button>
      </div>
      <div id="ai-chat-messages" style="flex:1;overflow-y:auto;padding:12px;font-size:0.9rem;background:#f9f9f9;min-height:250px;">
        <div class="ai-message bot" style="background:#FF8C00;color:white;padding:8px 12px;border-radius:12px 12px 12px 0;margin-bottom:8px;max-width:80%;">
          👋 Hello! Ask me anything about SmartPOS.
        </div>
      </div>
      <div style="display:flex;padding:8px;border-top:1px solid #eee;">
        <input type="text" id="ai-chat-input" placeholder="Type your question..." style="flex:1;padding:10px;border:1px solid #ddd;border-radius:20px;outline:none;">
        <button id="ai-send-btn" style="background:#FF8C00;color:white;border:none;border-radius:50%;width:40px;height:40px;margin-left:8px;cursor:pointer;">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
    `;
    document.body.appendChild(modal);

    // ---- Toggle chat ----
    fab.onclick = () => {
      modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
      if (modal.style.display === 'flex') {
        document.getElementById('ai-chat-input').focus();
      }
    };
    document.getElementById('ai-close-btn').onclick = () => {
      modal.style.display = 'none';
    };

    // ---- Send message ----
    async function sendMessage() {
      const input = document.getElementById('ai-chat-input');
      const msg = input.value.trim();
      if (!msg) return;
      input.value = '';
      appendMessage('user', msg);

      // Try backend endpoint (authenticated or public fallback)
      try {
        const token = localStorage.getItem('access_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const res = await fetch('/api/ai/chat/', {
          method: 'POST',
          headers,
          body: JSON.stringify({ message: msg })
        });
        if (res.ok) {
          const data = await res.json();
          appendMessage('bot', data.reply || data.answer || 'I am not sure about that.');
        } else {
          throw new Error('API failed');
        }
      } catch {
        appendMessage('bot', getLocalAnswer(msg));
      }
    }

    function appendMessage(sender, text) {
      const container = document.getElementById('ai-chat-messages');
      const div = document.createElement('div');
      div.className = 'ai-message ' + sender;
      div.style.cssText = sender === 'bot' ?
        'background:#FF8C00;color:white;padding:8px 12px;border-radius:12px 12px 12px 0;margin-bottom:8px;max-width:80%;' :
        'background:#e0e0e0;color:#333;padding:8px 12px;border-radius:12px 12px 0 12px;margin-bottom:8px;max-width:80%;margin-left:auto;';
      div.innerHTML = text.replace(/\n/g, '<br>');
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
    }

    function getLocalAnswer(question) {
      const q = question.toLowerCase();
      if (q.includes('login') || q.includes('sign in')) return "Go to the Login page and enter your email/phone and password. If you forgot your password, click 'Forgot Password'.";
      if (q.includes('register') || q.includes('sign up')) return "Click 'Start Free' on the homepage, fill in your business and owner details, then verify the OTP sent to your email/phone.";
      if (q.includes('expense') || q.includes('cost')) return "You can add expenses from the Expenses page. Click 'Add Expense' and enter the details.";
      if (q.includes('report') || q.includes('sales summary')) return "Go to Reports to see sales trends, export CSV, and view profit/loss summaries.";
      if (q.includes('inventory') || q.includes('product')) return "Manage products in Inventory. You can add, edit, delete products, and set low-stock alerts.";
      if (q.includes('discount')) return "You can set a product discount in Inventory, or apply a cart-level discount in the POS.";
      if (q.includes('tax')) return "VAT is 16% in Kenya. Tax is automatically added in POS; cashiers cannot disable it.";
      if (q.includes('mpesa') || q.includes('stk')) return "When you complete a sale with M‑Pesa, enter the customer's phone (07... or 01...) and click 'Send Payment Request'. The customer will get an STK push to enter their PIN.";
      return "I'm here to help! Ask me about sales, inventory, expenses, reports, or M‑Pesa payments.";
    }

    document.getElementById('ai-send-btn').onclick = sendMessage;
    document.getElementById('ai-chat-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }
})();

// --------------------------------------------------
// Keep the original full‑page AI assistant as a fallback
// (used when the user navigates to #/ai)
// --------------------------------------------------
function renderAIPage() {
  // Signal that we're on the dedicated AI page -> floating bubble hidden by init()
  document.body.setAttribute('data-page', 'ai');

  document.getElementById('main-content').innerHTML = `
    <div style="max-width:900px; margin:auto;">
      <div class="card" style="background: linear-gradient(135deg, #FF8C00, #FF5E7E); color: white; margin-bottom: 20px;">
        <div class="flex-between">
          <h2><i class="fas fa-robot"></i> AI Assistant</h2>
          <button class="btn btn-sm" onclick="window.location.hash='#/dashboard'" style="background: white; color: #FF5E7E;">
            <i class="fas fa-arrow-left"></i> Back to Dashboard
          </button>
        </div>
        <p style="opacity:0.9; margin-top:8px;">Ask me anything about SmartPOS – inventory, sales, reports, or get smart stocking advice.</p>
      </div>
      <div id="ai-chat-box" style="
        background: white; border-radius: 20px; padding: 25px;
        height: 55vh; overflow-y: auto; margin-bottom: 20px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.05);
        border: 1px solid #E2E8F0;
      ">
        <div class="chat-message bot">
          <div class="chat-avatar"><i class="fas fa-robot"></i></div>
          <div class="chat-bubble">Hello! How can I help you with SmartPOS? You can ask me about sales, inventory, reports, or say “What should I restock?”</div>
        </div>
      </div>
      <div style="display:flex; gap:12px;">
        <input type="text" id="ai-input" class="input-field" placeholder="Type your message... (e.g., 'What products are low in stock?')"
               style="flex:1; padding:15px 20px; border-radius:30px; font-size:1.1rem; border:2px solid #E2E8F0;">
        <button class="btn btn-primary" onclick="sendAIMessage()" style="background:#FF8C00; border-radius:30px; padding: 0 30px; font-size:1.1rem;">
          <i class="fas fa-paper-plane"></i> Send
        </button>
      </div>
    </div>
  `;

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && document.activeElement === document.getElementById('ai-input')) {
      sendAIMessage();
    }
  });
}

async function sendAIMessage() {
  const input = document.getElementById('ai-input');
  const chatBox = document.getElementById('ai-chat-box');
  const message = input?.value?.trim();
  if (!message || !chatBox) return;

  chatBox.innerHTML += `
    <div class="chat-message user">
      <div class="chat-avatar"><i class="fas fa-user"></i></div>
      <div class="chat-bubble">${message}</div>
    </div>`;
  input.value = '';
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const res = await api.post('/ai/chat/', { message });
    chatBox.innerHTML += `
      <div class="chat-message bot">
        <div class="chat-avatar"><i class="fas fa-robot"></i></div>
        <div class="chat-bubble">${res.data.reply.replace(/\n/g, '<br>')}</div>
      </div>`;
  } catch {
    chatBox.innerHTML += `
      <div class="chat-message bot">
        <div class="chat-avatar"><i class="fas fa-robot"></i></div>
        <div class="chat-bubble">Sorry, I'm having trouble. Please try again.</div>
      </div>`;
  }
  chatBox.scrollTop = chatBox.scrollHeight;
}