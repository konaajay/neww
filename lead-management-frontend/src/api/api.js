import axios from 'axios';

const getBaseURL = () => {
  const url = import.meta.env.VITE_API_BASE_URL || 
    (window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'http://34.225.217.229:8080');
  return url.endsWith('/api') ? url : `${url}/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 60000,
  withCredentials: true
});

// Parameter cleaning utility
export const cleanParams = (params) => {
  if (!params) return {};
  return Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v != null && v !== '')
  );
};

// Centralized Request Wrapper
export const safeRequest = async (req) => {
  try {
    const res = await req;
    return res.data;
  } catch (err) {
    if (!axios.isCancel(err)) {
      console.error('API Error:', err.response?.data?.message || err.message);
    }
    throw err;
  }
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Support for AbortSignal -> Axios CancelToken bridge
  if (config.signal) {
    const source = axios.CancelToken.source();
    config.cancelToken = source.token;
    config.signal.addEventListener('abort', () => {
      source.cancel('Operation canceled by the user.');
    });
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (!axios.isCancel(error)) {
      console.error(`%c[API-FAILURE] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, 'color: #ef4444; font-weight: bold;', error.message);
    }
    
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
