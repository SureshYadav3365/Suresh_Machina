const rawBase = import.meta.env.VITE_API_BASE_URL || 'https://suresh-machina.onrender.com/api';

const getBaseUrl = () => {
  if (!rawBase) return 'https://suresh-machina.onrender.com/api';
  const clean = rawBase.trim().replace(/\/+$/, '');
  if (clean === '/api' || clean.endsWith('/api')) {
    return clean;
  }
  return `${clean}/api`;
};

const API_BASE = getBaseUrl();

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err);
    throw err;
  }
}

export const api = {
  // Production
  getProduction: (date) => {
    return request(`/production${date ? `?date=${date}` : ''}`);
  },
  saveProduction: (data) =>
    request('/production', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProduction: (id, data) =>
    request(`/production/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteProduction: (id) =>
    request(`/production/${id}`, {
      method: 'DELETE',
    }),
  setDailyShift: (data) =>
    request('/production/shift', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Production History
  getProductionHistory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/production/history${query ? `?${query}` : ''}`);
  },
  deleteDayProduction: (date) =>
    request(`/production/day/${date}`, {
      method: 'DELETE',
    }),

  // Expenses
  getExpenses: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/expenses${query ? `?${query}` : ''}`);
  },
  createExpense: (data) =>
    request('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateExpense: (id, data) =>
    request(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteExpense: (id) =>
    request(`/expenses/${id}`, {
      method: 'DELETE',
    }),

  // Revenue & Profit
  getSalesRevenue: (date) =>
    request(`/expenses/revenue${date ? `?date=${date}` : ''}`),
  saveSalesRevenue: (data) =>
    request('/expenses/revenue', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
