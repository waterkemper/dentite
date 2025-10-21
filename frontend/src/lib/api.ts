import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Billing API
export const billingApi = {
  createCheckoutSession: (priceId: string) => 
    api.post('/billing/checkout', { priceId }),
  
  createPortalSession: () => 
    api.post('/billing/portal'),
  
  getSubscription: () => 
    api.get('/billing/subscription'),
  
  getUsage: () => 
    api.get('/billing/usage'),
};

