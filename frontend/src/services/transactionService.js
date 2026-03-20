import api from './api.js';

export const getTransactions = () => api.get('/transactions').then((r) => r.data);

export const createTransaction = (payload) =>
  api.post('/transactions', payload).then((r) => r.data);

export const getDashboard = () => api.get('/dashboard').then((r) => r.data);
