import api from './api.js';

export const signIn = async (username, password) => {
  const { data } = await api.post('/auth/signin', { username, password });
  localStorage.setItem('forge_token', data.token);
  localStorage.setItem('forge_user', JSON.stringify(data.user));
  return data;
};

export const signUp = async (payload) => {
  const { data } = await api.post('/auth/signup', payload);
  localStorage.setItem('forge_token', data.token);
  localStorage.setItem('forge_user', JSON.stringify(data.user));
  return data;
};

export const signOut = () => {
  localStorage.removeItem('forge_token');
  localStorage.removeItem('forge_user');
};

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('forge_user'));
  } catch {
    return null;
  }
};

export const getToken = () => localStorage.getItem('forge_token');
