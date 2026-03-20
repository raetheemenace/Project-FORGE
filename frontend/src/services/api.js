import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('forge_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to sign-in on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('forge_token');
      localStorage.removeItem('forge_user');
      window.location.href = '/signin?expired=1';
    }
    return Promise.reject(err);
  }
);

export default api;
