// Authentication Service
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Storage keys
const TOKEN_KEY = 'forge_token';
const USER_KEY = 'forge_user';
// Session storage keys (for non-persistent sessions)
const SESSION_TOKEN_KEY = 'forge_session_token';
const SESSION_USER_KEY = 'forge_session_user';

/**
 * Determine storage based on rememberMe flag
 * @param {boolean} rememberMe - Whether to use persistent storage
 * @returns {'localStorage'|'sessionStorage'} Storage type
 */
function getStorage(rememberMe) {
  return rememberMe ? localStorage : sessionStorage;
}

/**
 * Clear all auth storage (both persistent and session)
 * Also migrates legacy keys
 */
function clearAllAuthStorage() {
  // Clear new keys
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  sessionStorage.removeItem(SESSION_USER_KEY);

  // Clear legacy keys for backwards compatibility
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

/**
 * Get token from storage (checks both for backwards compatibility)
 * @returns {string|null} JWT token or null
 */
export function getToken() {
  // Check persistent storage first (new method)
  const persistentToken = localStorage.getItem(TOKEN_KEY);
  if (persistentToken) return persistentToken;

  // Check legacy keys for backwards compatibility
  const legacyToken = localStorage.getItem('token');
  if (legacyToken) {
    // Migrate to new key
    localStorage.setItem(TOKEN_KEY, legacyToken);
    localStorage.removeItem('token');
    return legacyToken;
  }

  // Check session storage (non-persistent sessions)
  const sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (sessionToken) return sessionToken;

  return null;
}

/**
 * Get current user from storage
 * @returns {object|null} User object or null
 */
export function getCurrentUser() {
  // Check persistent storage first
  const persistentUser = localStorage.getItem(USER_KEY);
  if (persistentUser) return JSON.parse(persistentUser);

  // Check legacy key
  const legacyUser = localStorage.getItem('user');
  if (legacyUser) {
    localStorage.setItem(USER_KEY, legacyUser);
    localStorage.removeItem('user');
    return JSON.parse(legacyUser);
  }

  // Check session storage
  const sessionUser = sessionStorage.getItem(SESSION_USER_KEY);
  if (sessionUser) return JSON.parse(sessionUser);

  return null;
}

/**
 * Sign up a new user
 * @param {object} userData - User registration data
 * @param {boolean} rememberMe - Whether to persist login across sessions
 * @returns {Promise<object>} Response with token and user data
 */
export async function signUp(userData, rememberMe = false) {
  try {
    const response = await axios.post(`${API_URL}/auth/signup`, userData, {
      timeout: 30000 // 30 second timeout
    });

    const storage = getStorage(rememberMe);
    if (response.data.token) {
      storage.setItem(TOKEN_KEY, response.data.token);
      storage.setItem(USER_KEY, JSON.stringify(response.data.user));
    }

    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    if (!error.response) {
      throw new Error('Could not connect to server. Please try again later.');
    }
    throw error;
  }
}

/**
 * Sign in an existing user
 * @param {string} tipEmail - TIP institutional email address
 * @param {string} studentId - Student ID
 * @param {boolean} rememberMe - Whether to persist login across sessions
 * @returns {Promise<object>} Response with token and user data
 */
export async function signIn(tipEmail, studentId, rememberMe = false) {
  try {
    const response = await axios.post(`${API_URL}/auth/signin`, {
      tipEmail,
      studentId
    }, {
      timeout: 30000 // 30 second timeout
    });

    const storage = getStorage(rememberMe);
    if (response.data.token) {
      storage.setItem(TOKEN_KEY, response.data.token);
      storage.setItem(USER_KEY, JSON.stringify(response.data.user));
    }

    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    if (!error.response) {
      throw new Error('Could not connect to server. Please try again later.');
    }
    throw error;
  }
}

/**
 * Sign out the current user
 * Clears both persistent and session storage
 */
export function signOut() {
  clearAllAuthStorage();
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
