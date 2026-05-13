// ========== LOGIN ==========
function renderLoginPage() {
  document.getElementById('main-content').innerHTML = `
    <div id="public-overlay" style="
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: var(--bg-light); display: flex; align-items: center;
      justify-content: center; z-index: 99999;
    ">
      <div class="card" style="max-width:450px; width:100%; border-top: 4px solid #FF8C00;">
        <h2 class="text-center" style="color:#FF8C00;"><i class="fas fa-sign-in-alt"></i> Login</h2>
        <form id="login-form">
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="login-email" class="input-field" required>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="login-password" class="input-field" required>
            <span class="password-toggle" onclick="togglePasswordVisibility('login-password', this)"><i class="fas fa-eye"></i></span>
          </div>
          <button type="submit" class="btn btn-primary w-full mt-20" style="background:#FF8C00; color:white;">Login</button>
        </form>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px;">
          <a href="#/forgot-password" style="color:#FF8C00; font-weight:500;">Forgot password?</a>
          <a href="#/register" style="color:#FF8C00; font-weight:500;">Create account</a>
        </div>
      </div>
    </div>
  `;
  document.getElementById('login-form').addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showToast('Please fill in all fields.', 'error');
    return;
  }

  const btn = document.querySelector('#login-form button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Logging in...';

  try {
    const data = await loginUser({ email, password });
    localStorage.setItem('access_token', data.tokens.access);
    localStorage.setItem('refresh_token', data.tokens.refresh);

    // Refresh header/sidebar in background – no need to wait for it
    loadUserInfo().catch(e => console.error(e));

    showToast('Welcome back!', 'success');
    // Redirect immediately
    window.location.hash = '#/dashboard';
  } catch (error) {
    const status = error.response?.status;
    const errData = error.response?.data;
    if (status === 423 && errData?.locked_seconds) {
      showToast('Account locked due to too many attempts.', 'error');
      showLockoutTimer(errData.locked_seconds);
      return;
    }
    if (status === 401) {
      showToast('Invalid email or password.', 'error');
      return;
    }
    showToast('Something went wrong. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Login';
  }
}

function showLockoutTimer(seconds) {
  const form = document.getElementById('login-form');
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-clock"></i> Locked – wait <span id="lockout-timer">${seconds}s</span>`;
  const interval = setInterval(() => {
    seconds--;
    const timerEl = document.getElementById('lockout-timer');
    if (timerEl) timerEl.textContent = `${seconds}s`;
    if (seconds <= 0) {
      clearInterval(interval);
      btn.disabled = false;
      btn.innerHTML = 'Login';
    }
  }, 1000);
}

// ========== REGISTER ==========
function renderRegisterPage() {
  document.getElementById('main-content').innerHTML = `
    <div id="public-overlay" style="
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: var(--bg-light); display: flex; align-items: center;
      justify-content: center; z-index: 99999; overflow-y: auto;
    ">
      <div class="card" style="max-width:520px; width:100%; margin: 20px;
           max-height: 90vh; overflow-y: auto; padding: 28px 32px; border-top: 4px solid #FF8C00;">
        <h2 class="text-center" style="color:#FF8C00; margin-bottom: 5px;">
          <i class="fas fa-user-plus"></i> Create Account
        </h2>
        <p class="text-center" style="color: #718096; margin-bottom: 20px; font-size: 0.9rem;">
          Set up your business and owner profile
        </p>
        <form id="register-form">
          <fieldset style="border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 20px; margin-bottom: 20px;">
            <legend style="font-weight: 700; color: #FF8C00; padding: 0 10px;">
              <i class="fas fa-building"></i> Business Details
            </legend>
            <div class="form-group">
              <label>Business Name *</label>
              <input type="text" id="reg-business" class="input-field" placeholder="e.g., ABC Supermarket" required>
              <small id="business-error" class="error-text"></small>
            </div>
          </fieldset>
          <fieldset style="border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 20px; margin-bottom: 20px;">
            <legend style="font-weight: 700; color: #FF8C00; padding: 0 10px;">
              <i class="fas fa-user"></i> Owner Details
            </legend>
            <div class="form-group">
              <label>Full Name *</label>
              <input type="text" id="reg-name" class="input-field" placeholder="John Doe" required>
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="reg-email" class="input-field" placeholder="you@example.com">
            </div>
            <div class="form-group">
              <label>Phone (e.g., +254...)</label>
              <input type="tel" id="reg-phone" class="input-field" placeholder="+254712345678">
            </div>
            <div class="form-group">
              <label>Password</label>
              <div style="position:relative;">
                <input type="password" id="reg-password" class="input-field" placeholder="••••••••" oninput="checkPasswordStrength()" required>
                <span class="password-toggle" onclick="togglePasswordVisibility('reg-password', this)" style="position:absolute; right:14px; top:50%; transform:translateY(-50%); cursor:pointer; color:#A0AEC0; font-size:1.2rem;">
                  <i class="fas fa-eye"></i>
                </span>
              </div>
              <div class="password-strength"><div id="strength-bar" class="strength-bar"></div></div>
              <small id="strength-text"></small>
            </div>
            <div class="form-group">
              <label>Confirm Password</label>
              <div style="position:relative;">
                <input type="password" id="reg-password2" class="input-field" placeholder="••••••••" oninput="checkPasswordMatch()" required>
                <span class="password-toggle" onclick="togglePasswordVisibility('reg-password2', this)" style="position:absolute; right:14px; top:50%; transform:translateY(-50%); cursor:pointer; color:#A0AEC0; font-size:1.2rem;">
                  <i class="fas fa-eye"></i>
                </span>
              </div>
              <small id="match-message" style="font-size:0.85rem; margin-top:4px; display:block;"></small>
            </div>
          </fieldset>
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:20px;">
            <input type="checkbox" id="terms-check" required style="width:18px; height:18px; cursor:pointer;">
            <label for="terms-check" style="margin:0; font-weight:500; font-size:0.95rem; cursor:pointer;">
              I agree to the <a href="#/terms" target="_blank">Terms</a> &amp; <a href="#/privacy" target="_blank">Privacy</a>
            </label>
          </div>
          <button type="submit" class="btn btn-primary w-full" id="reg-btn" disabled style="background:#FF8C00; color:white;">
            <i class="fas fa-user-check"></i> Register
          </button>
        </form>
        <p class="text-center mt-20">Already have an account? <a href="#/login" style="color:#FF8C00;">Login</a></p>
      </div>
    </div>
  `;

  document.getElementById('terms-check').addEventListener('change', function() {
    document.getElementById('reg-btn').disabled = !this.checked;
  });
  document.getElementById('register-form').addEventListener('submit', handleRegister);

  const pass1 = document.getElementById('reg-password');
  const pass2 = document.getElementById('reg-password2');
  const matchMsg = document.getElementById('match-message');
  if (pass1 && pass2 && matchMsg) {
    const updateMatch = () => {
      if (pass2.value === '') {
        matchMsg.innerHTML = '';
      } else if (pass1.value === pass2.value) {
        matchMsg.innerHTML = '<span style="color:var(--secondary);">✅ Passwords match</span>';
      } else {
        matchMsg.innerHTML = '<span style="color:var(--accent);">❌ Passwords do not match</span>';
      }
    };
    pass1.addEventListener('input', updateMatch);
    pass2.addEventListener('input', updateMatch);
  }
}

async function handleRegister(e) {
  e.preventDefault();

  if (!document.getElementById('reg-business').value.trim() ||
      !document.getElementById('reg-name').value.trim() ||
      !document.getElementById('reg-password').value ||
      !document.getElementById('reg-password2').value) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  const regBtn = document.getElementById('reg-btn');
  regBtn.disabled = true;
  regBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Registering...';

  const data = {
    business_name: document.getElementById('reg-business').value,
    full_name: document.getElementById('reg-name').value,
    email: document.getElementById('reg-email').value,
    phone: document.getElementById('reg-phone').value,
    password: document.getElementById('reg-password').value,
    password2: document.getElementById('reg-password2').value,
  };

  try {
    const res = await registerUser(data);
    showToast('Registration successful! Please verify OTP.', 'success');
    localStorage.setItem('pendingUserId', res.user_id);
    setTimeout(() => { window.location.hash = '#/otp-verification'; }, 1000);
  } catch (error) {
    console.log('Full error:', error);
    const errData = error.response?.data;
    if (errData) {
      const messages = [];
      for (const [field, msg] of Object.entries(errData)) {
        messages.push(...(Array.isArray(msg) ? msg : [msg]));
      }
      if (messages.length > 0) {
        showToast(messages.join('\n'), 'error');
      } else if (errData.detail) {
        showToast(errData.detail, 'error');
      } else {
        showToast('Registration failed.', 'error');
      }
    } else {
      showToast('Network error. Please try again.', 'error');
    }
  } finally {
    regBtn.disabled = false;
    regBtn.innerHTML = '<i class="fas fa-user-check"></i> Register';
  }
}

// ========== OTP ==========
let otpTimerInterval;

function renderOTPPage() {
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const purpose = params.get('purpose') || 'signup';
  const userId = localStorage.getItem('pendingUserId');
  if (!userId) {
    window.location.hash = '#/login';
    return;
  }
  document.getElementById('main-content').innerHTML = `
    <div id="public-overlay" style="
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: var(--bg-light); display: flex; align-items: center;
      justify-content: center; z-index: 99999;
    ">
      <div class="card" style="max-width:400px; width:100%;">
        <h2 class="text-center" style="color:#FF8C00;">Verify OTP</h2>
        <form id="otp-form">
          <div class="form-group">
            <label>Enter 6‑digit code</label>
            <input type="text" id="otp-code" class="input-field" maxlength="6" required autocomplete="off">
          </div>
          <button type="submit" class="btn btn-primary w-full" id="verify-btn" style="background:#FF8C00;">
            <i class="fas fa-check-circle"></i> Verify
          </button>
        </form>
        <div class="flex-between mt-20">
          <span id="timer">1:40</span>
          <button id="resend-btn" class="btn btn-outline" onclick="resendOTP()">Resend OTP</button>
        </div>
      </div>
    </div>
  `;
  startOTPTimer();
  document.getElementById('otp-form').addEventListener('submit', (e) => handleOTPVerify(e, purpose));
}

function startOTPTimer() {
  let seconds = 100;
  const timerEl = document.getElementById('timer');
  const resendBtn = document.getElementById('resend-btn');
  if (!timerEl || !resendBtn) return;

  const updateDisplay = () => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  updateDisplay();
  resendBtn.disabled = true;
  clearInterval(otpTimerInterval);
  otpTimerInterval = setInterval(() => {
    seconds--;
    updateDisplay();
    if (seconds <= 0) {
      clearInterval(otpTimerInterval);
      timerEl.textContent = 'Expired';
      resendBtn.disabled = false;
    }
  }, 1000);
}

function resendOTP() {
  showToast('A new OTP has been sent. Please check your email/SMS.', 'info');
  startOTPTimer();
}

async function handleOTPVerify(e, purpose = 'signup') {
  e.preventDefault();
  const code = document.getElementById('otp-code').value.trim();
  if (code.length !== 6) {
    showToast('Please enter a valid 6‑digit code', 'error');
    return;
  }

  const btn = document.getElementById('verify-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Verifying...';

  const userId = localStorage.getItem('pendingUserId');
  try {
    const res = await verifyOTP({ user_id: userId, code, purpose });
    if (res.tokens) {
      localStorage.setItem('access_token', res.tokens.access);
      localStorage.setItem('refresh_token', res.tokens.refresh);
      localStorage.removeItem('pendingUserId');
      showToast('Account verified!', 'success');
      setTimeout(() => { window.location.hash = '#/dashboard'; }, 1000);
    } else if (res.reset_token) {
      localStorage.setItem('reset_token', res.reset_token);
      localStorage.removeItem('pendingUserId');
      window.location.hash = '#/reset-password';
    } else {
      showToast('OTP verified', 'success');
    }
  } catch (error) {
    const errMsg = error.response?.data?.error || 'Invalid OTP';
    if (errMsg.includes('expired')) {
      showToast('OTP has expired. Please request a new one.', 'error');
    } else {
      showToast(errMsg, 'error');
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check-circle"></i> Verify';
  }
}

// ========== FORGOT PASSWORD ==========
function renderForgotPasswordPage() {
  document.getElementById('main-content').innerHTML = `
    <div id="public-overlay" style="
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: var(--bg-light); display: flex; align-items: center;
      justify-content: center; z-index: 99999;
    ">
      <div class="card" style="max-width:400px; width:100%;">
        <h2>Forgot Password</h2>
        <form id="forgot-form">
          <div class="form-group">
            <label>Email or Phone</label>
            <input type="text" id="forgot-contact" class="input-field" required>
          </div>
          <button type="submit" class="btn btn-primary w-full">Send Reset OTP</button>
        </form>
        <p class="text-center mt-20"><a href="#/login">Back to Login</a></p>
      </div>
    </div>
  `;
  document.getElementById('forgot-form').addEventListener('submit', handleForgot);
}

async function handleForgot(e) {
  e.preventDefault();
  const contact = document.getElementById('forgot-contact').value;
  const isEmail = contact.includes('@');
  try {
    const res = await forgotPassword(isEmail ? { email: contact } : { phone: contact });
    localStorage.setItem('pendingUserId', res.user_id);
    showToast('OTP sent', 'success');
    window.location.hash = '#/otp-verification?purpose=password_reset';
  } catch (error) {
    showToast(error.response?.data?.error || 'Failed', 'error');
  }
}

// Terms of Service
function renderTermsOfService() {
  document.getElementById('main-content').innerHTML = `
    <div class="info-page">
      <div class="info-card">
        <i class="fas fa-file-contract info-icon"></i>
        <h1>Terms of Service</h1>
        <p class="info-date">Effective date: January 1, 2025</p>
        <hr>
        <div class="info-body">
          <h3>1. Acceptance of Terms</h3>
          <p>By creating an account or using SmartPOS, you agree to be bound by these Terms.</p>
          <h3>2. Eligibility</h3>
          <p>You must be at least 18 years old and have the legal capacity to enter into this agreement.</p>
          <h3>3. Account Registration</h3>
          <p>You must provide accurate, current, and complete information during registration.</p>
          <h3>4. Acceptable Use</h3>
          <p>You agree not to misuse the service.</p>
          <h3>5. Subscription & Billing</h3>
          <p>We offer both free and paid plans. Subscription fees are billed in advance.</p>
          <h3>6. Intellectual Property</h3>
          <p>SmartPOS and its original content are owned by us and protected by copyright laws.</p>
          <h3>7. Third‑Party Services</h3>
          <p>We may integrate with third‑party providers. We are not responsible for their service.</p>
          <h3>8. Limitation of Liability</h3>
          <p>SmartPOS shall not be liable for any indirect, incidental, special, or consequential damages.</p>
          <h3>9. Termination</h3>
          <p>We reserve the right to suspend or terminate your account if you violate these Terms.</p>
          <h3>10. Changes to Terms</h3>
          <p>We may update these Terms at any time. Continued use after changes constitutes acceptance.</p>
          <h3>11. Governing Law</h3>
          <p>These Terms shall be governed by the laws of Kenya.</p>
          <h3>12. Contact Information</h3>
          <p>For questions, visit our <a href="#/contact">Contact page</a>.</p>
        </div>
      </div>
    </div>
  `;
}

// Privacy Policy
function renderPrivacyPolicy() {
  document.getElementById('main-content').innerHTML = `
    <div class="info-page">
      <div class="info-card">
        <i class="fas fa-shield-alt info-icon"></i>
        <h1>Privacy Policy</h1>
        <p class="info-date">Last updated: January 1, 2025</p>
        <hr>
        <div class="info-body">
          <h3>1. Introduction</h3>
          <p>SmartPOS respects your privacy. This policy explains how we collect, use, and protect your personal data.</p>
          <h3>2. Information We Collect</h3>
          <p>We collect registration details (name, email, phone, business name), transaction records.</p>
          <h3>3. How We Use Your Data</h3>
          <p>We use your data to provide and improve the service, process transactions, send alerts.</p>
          <h3>4. Cookies & Tracking</h3>
          <p>We use essential cookies to keep you logged in and improve user experience.</p>
          <h3>5. Data Sharing</h3>
          <p>We do not sell your personal data.</p>
          <h3>6. Data Retention</h3>
          <p>We retain your data as long as your account is active.</p>
          <h3>7. Data Security</h3>
          <p>We implement encryption, secure servers, and access controls.</p>
          <h3>8. Your Rights</h3>
          <p>You have the right to access, correct, or delete your personal data.</p>
          <h3>9. Children’s Privacy</h3>
          <p>SmartPOS is not intended for individuals under 18.</p>
          <h3>10. International Transfers</h3>
          <p>Your data may be processed in countries outside your own.</p>
          <h3>11. Changes to This Policy</h3>
          <p>We will notify you of any material changes.</p>
          <h3>12. Contact Us</h3>
          <p>Email <a href="mailto:privacy@smartpos.com">privacy@smartpos.com</a>.</p>
        </div>
      </div>
    </div>
  `;
}

// Homepage
function renderHomepage() {
  document.getElementById('main-content').innerHTML = `
    <div id="public-overlay" style="
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: linear-gradient(135deg, #FF8C00 0%, #FF5E7E 50%, #FF8C00 100%);
      display: flex; align-items: flex-start; justify-content: center;
      z-index: 99999; color: white; padding: 30px 20px 40px; overflow-y: auto;
    ">
      <div style="max-width:1100px; width:100%;">

        <div style="display:flex; align-items:center; gap:12px; margin-bottom:30px;">
          <div style="background: white; border-radius: 16px; padding: 12px; display:flex; align-items:center; justify-content:center; box-shadow: 0 8px 20px rgba(0,0,0,0.2);">
            <i class="fas fa-cash-register" style="font-size:2.2rem; color:#FF8C00;"></i>
          </div>
          <span style="font-size:2rem; font-weight:800; color:white;">SmartPOS</span>
        </div>

        <div style="display:flex; flex-wrap:wrap; align-items:center; gap:60px;">
          <div style="flex:1; min-width:280px;">
            <i class="fas fa-rocket" style="font-size:2.8rem; margin-bottom:15px;"></i>
            <h1 style="font-size:2.8rem; font-weight:800; margin-bottom:15px; line-height:1.2;">Grow Your Business</h1>
            <p style="font-size:1.2rem; opacity:0.95; margin-bottom:30px;">
              Intelligent point‑of‑sale that helps you sell faster, track inventory, and make smarter decisions.
            </p>

            <div style="display:flex; gap:15px; flex-wrap:wrap; margin-bottom:30px;">
              <button id="home-register-btn" style="
                background: white; color: #FF5E7E; padding: 16px 38px;
                border-radius: 50px; font-weight: 700; font-size: 1.1rem;
                border: none; cursor: pointer; box-shadow: 0 8px 25px rgba(0,0,0,0.2);
                transition: transform 0.3s ease;
              " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">Start Free</button>
              <button id="home-login-btn" style="
                border: 2px solid white; color: white; padding: 16px 38px;
                border-radius: 50px; font-weight: 700; font-size: 1.1rem;
                background: transparent; cursor: pointer;
                transition: background 0.3s ease, transform 0.3s ease;
              " onmouseover="this.style.background='rgba(255,255,255,0.2)'; this.style.transform='scale(1.05)'" onmouseout="this.style.background='transparent'; this.style.transform='scale(1)'">Login</button>
            </div>
          </div>

          <div style="flex:1; display:grid; grid-template-columns:1fr 1fr; gap:15px;">
            <div style="background:rgba(255,255,255,0.18); backdrop-filter:blur(10px); border-radius:16px; padding:20px; text-align:center;">
              <i class="fas fa-bolt" style="font-size:2rem; margin-bottom:10px;"></i>
              <h4 style="margin-bottom:5px;">Fast Checkout</h4>
              <p style="font-size:0.85rem; opacity:0.9;">Scan, tap, and sell in seconds.</p>
            </div>
            <div style="background:rgba(255,255,255,0.18); backdrop-filter:blur(10px); border-radius:16px; padding:20px; text-align:center;">
              <i class="fas fa-credit-card" style="font-size:2rem; margin-bottom:10px;"></i>
              <h4 style="margin-bottom:5px;">Multi‑Payment</h4>
              <p style="font-size:0.85rem; opacity:0.9;">Cash, Card, M‑Pesa.</p>
            </div>
            <div style="background:rgba(255,255,255,0.18); backdrop-filter:blur(10px); border-radius:16px; padding:20px; text-align:center;">
              <i class="fas fa-boxes" style="font-size:2rem; margin-bottom:10px;"></i>
              <h4 style="margin-bottom:5px;">Inventory Sync</h4>
              <p style="font-size:0.85rem; opacity:0.9;">Real‑time across branches.</p>
            </div>
            <div style="background:rgba(255,255,255,0.18); backdrop-filter:blur(10px); border-radius:16px; padding:20px; text-align:center;">
              <i class="fas fa-chart-pie" style="font-size:2rem; margin-bottom:10px;"></i>
              <h4 style="margin-bottom:5px;">Analytics</h4>
              <p style="font-size:0.85rem; opacity:0.9;">Sales trends & reports.</p>
            </div>
            <div style="background:rgba(255,255,255,0.18); backdrop-filter:blur(10px); border-radius:16px; padding:20px; text-align:center;">
              <i class="fas fa-users" style="font-size:2rem; margin-bottom:10px;"></i>
              <h4 style="margin-bottom:5px;">Loyalty</h4>
              <p style="font-size:0.85rem; opacity:0.9;">Track & reward customers.</p>
            </div>
            <div style="background:rgba(255,255,255,0.18); backdrop-filter:blur(10px); border-radius:16px; padding:20px; text-align:center;">
              <i class="fas fa-mobile-alt" style="font-size:2rem; margin-bottom:10px;"></i>
              <h4 style="margin-bottom:5px;">Mobile Ready</h4>
              <p style="font-size:0.85rem; opacity:0.9;">Works on any device.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('home-register-btn').addEventListener('click', function() {
    window.location.hash = '#/register';
  });
  document.getElementById('home-login-btn').addEventListener('click', function() {
    window.location.hash = '#/login';
  });
}