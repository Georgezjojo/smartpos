const API_BASE = window.location.origin + '/api/';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ---------- Auth ----------
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/token/refresh/`, { refresh: refreshToken });
          localStorage.setItem('access_token', data.access);
          api.defaults.headers.common['Authorization'] = `Bearer ${data.access}`;
          return api(originalRequest);
        } catch {
          localStorage.clear();
          window.location.hash = '#/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ---------- Auth endpoints ----------
async function registerUser(userData) { return (await api.post('/auth/register/', userData)).data; }
async function loginUser(credentials) { return (await api.post('/auth/login/', credentials)).data; }
async function verifyOTP(data) { return (await api.post('/auth/otp/verify/', data)).data; }
async function forgotPassword(data) { return (await api.post('/auth/forgot-password/', data)).data; }
async function getProfile() { return (await api.get('/auth/profile/')).data; }
async function updateProfile(data) { return (await api.put('/auth/profile/', data)).data; }
async function changePassword(data) { return (await api.post('/auth/change-password/', data)).data; }

// ---------- Business ----------
async function getBusiness() { return (await api.get('/business/businesses/')).data; }
async function getBranches() { return (await api.get('/business/branches/')).data; }

// ---------- Products / Inventory ----------
async function getProducts(params = {}) { return (await api.get('/inventory/products/', { params })).data; }
async function createProduct(data) { return (await api.post('/inventory/products/', data)).data; }
async function updateProduct(id, data) { return (await api.put(`/inventory/products/${id}/`, data)).data; }
async function deleteProduct(id) { return (await api.delete(`/inventory/products/${id}/`)).data; }

// ---------- Sales ----------
async function createSale(data) { return (await api.post('/sales/sales/', data)).data; }
async function getRecentSales() { return (await api.get('/sales/sales/recent/')).data; }
async function getCustomers() { return (await api.get('/sales/customers/')).data; }

// ---------- Reports ----------
async function getSalesSummary() { return (await api.get('/reports/summary/')).data; }
async function getProfitLoss() { return (await api.get('/reports/profit-loss/')).data; }

// ---------- Notifications ----------
async function getNotifications() { return (await api.get('/notifications/notifications/')).data; }

// ---------- Export (using authenticated API) ----------
async function exportReport(type) {
  try {
    const response = await api.get(`/reports/export/${type}/`, { responseType: 'blob' });
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

async function createProductWithImage(formData) {
  return (await api.post('/inventory/products/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })).data;
}

async function updateProductWithImage(id, formData) {
  return (await api.put(`/inventory/products/${id}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })).data;
}