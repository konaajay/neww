import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta.env.DEV 
    ? `http://${window.location.hostname}:8081/api` 
    : (import.meta.env.VITE_API_URL ? (import.meta.env.VITE_API_URL.endsWith('/api') ? import.meta.env.VITE_API_URL : `${import.meta.env.VITE_API_URL}/api`) : 'https://sales-backend-1-3tnk.onrender.com/api')
  ),
  timeout: 60000
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
    if (axios.isCancel(err)) {
      // Suppress noise for canceled requests (likely React Query refetches)
      if (import.meta.env.DEV) console.debug('Request canceled:', err.message);
    } else {
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
  
  // TRAFFIC MONITOR: Log every request
  console.log(`%c[API-REQUEST] ${config.method.toUpperCase()} ${config.url}`, 'color: #3b82f6; font-weight: bold;');
  
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
    console.log(`%c[API-SUCCESS] ${response.config.method.toUpperCase()} ${response.config.url}`, 'color: #10b981; font-weight: bold;');
    return response;
  },
  (error) => {
    console.error(`%c[API-FAILURE] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, 'color: #ef4444; font-weight: bold;', error.message);
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
