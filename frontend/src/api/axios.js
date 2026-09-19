import axios from 'axios';

const rawBaseURL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://expense-tracker-s88j.onrender.com' : 'http://127.0.0.1:8000');
const apiBaseURL = rawBaseURL.endsWith('/api') ? rawBaseURL : `${rawBaseURL.replace(/\/$/, '')}/api`;
const rootBaseURL = rawBaseURL.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 120000, // 2-minute safety timeout to survive cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

// Non-blocking pre-warm ping to wake up the cloud backend immediately
export const prewarmBackend = () => {
  try {
    fetch(`${rootBaseURL}/health`, { mode: 'cors' }).catch(() => { });
  } catch (_e) {
    // Ignore error for pre-warm
  }
};

// Fire pre-warm immediately on module load
if (typeof window !== 'undefined') {
  prewarmBackend();
}

let slowRequestTimer = null;
let activeSlowRequests = 0;

// Request interceptor to add JWT token & monitor cold start delays
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Monitor for cold-start delay (>2.5s)
    activeSlowRequests += 1;
    if (!slowRequestTimer) {
      slowRequestTimer = setTimeout(() => {
        if (activeSlowRequests > 0 && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('backend-waking-up'));
        }
      }, 2500);
    }

    return config;
  },
  (error) => {
    activeSlowRequests = Math.max(0, activeSlowRequests - 1);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    activeSlowRequests = Math.max(0, activeSlowRequests - 1);
    if (activeSlowRequests === 0) {
      clearTimeout(slowRequestTimer);
      slowRequestTimer = null;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('backend-ready'));
      }
    }
    return response;
  },
  (error) => {
    activeSlowRequests = Math.max(0, activeSlowRequests - 1);
    if (activeSlowRequests === 0) {
      clearTimeout(slowRequestTimer);
      slowRequestTimer = null;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('backend-ready'));
      }
    }

    if (error.response && error.response.status === 401) {
      const isAuthRequest = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
      const isAuthPage = typeof window !== 'undefined' && window.location.pathname === '/login';
      if (!isAuthRequest && !isAuthPage) {
        // Clear token and redirect to login if unauthorized on protected page
        localStorage.removeItem('token');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

