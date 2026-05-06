function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), timeout);
  };
}

function togglePasswordVisibility(inputId, iconSpan) {
  const input = document.getElementById(inputId);
  const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
  input.setAttribute('type', type);
  iconSpan.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
}

function checkPasswordStrength(inputId = 'reg-password') {
  const password = document.getElementById(inputId).value;
  const strengthBar = document.getElementById('strength-bar');
  const strengthText = document.getElementById('strength-text');
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = ['very weak','weak','fair','good','strong','very strong'];
  const level = levels[score] || 'very weak';   // score 0→very weak, 5→very strong
  if (strengthBar) {
    strengthBar.className = `strength-bar strength-${level.replace(' ', '-')}`;
    strengthBar.style.width = `${(score / 5) * 100}%`;
  }
  if (strengthText) strengthText.textContent = level;
}

function checkPasswordMatch() {
  const pass1 = document.getElementById('reg-password').value;
  const pass2 = document.getElementById('reg-password2').value;
  const icon = document.getElementById('match-icon');
  if (!icon) return;
  if (pass2 === '') icon.innerHTML = '';
  else if (pass1 === pass2) icon.innerHTML = '<i class="fas fa-check-circle" style="color:var(--secondary)"></i>';
  else icon.innerHTML = '<i class="fas fa-times-circle" style="color:var(--accent)"></i>';
}