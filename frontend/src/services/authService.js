// Authentication Service
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Sign up a new user
 * @param {object} userData - User registration data
 * @returns {Promise<object>} Response with token and user data
 */
export async function signUp(userData) {
  try {
    const response = await axios.post(`${API_URL}/auth/signup`, userData, {
      timeout: 30000 // 30 second timeout
    });
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  } catch (error) {
    // Handle specific error cases
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    
    if (!error.response) {
      // Network error, CORS error, or server unreachable
      throw new Error('Could not connect to server. Please try again later.');
    }
    
    // Pass through server errors
    throw error;
  }
}

/**
 * Sign in an existing user
 * @param {string} tipEmail - TIP institutional email address
 * @param {string} studentId - Student ID
 * @returns {Promise<object>} Response with token and user data
 */
export async function signIn(tipEmail, studentId) {
  try {
    const response = await axios.post(`${API_URL}/auth/signin`, {
      tipEmail,
      studentId
    }, {
      timeout: 30000 // 30 second timeout
    });
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  } catch (error) {
    // Handle specific error cases
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    
    if (!error.response) {
      // Network error, CORS error, or server unreachable
      throw new Error('Could not connect to server. Please try again later.');
    }
    
    // Pass through server errors
    throw error;
  }
}

/**
 * Sign out the current user
 */
export function signOut() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

/**
 * Get the current user from localStorage
 * @returns {object|null} User object or null
 */
export function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

/**
 * Get the current auth token
 * @returns {string|null} JWT token or null
 */
export function getToken() {
  return localStorage.getItem('token');
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if user has a valid token
 */
export function isAuthenticated() {
  return !!getToken();
}

/**
 * Set up axios interceptor to include auth token in requests
 */
export function setupAxiosInterceptor() {
  axios.interceptors.request.use(
    (config) => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Token expired or invalid
        signOut();
        window.location.href = '/signin';
      }
      return Promise.reject(error);
    }
  );
}
