import api from './api.js';

export const submitMaintenanceReport = (payload) =>
  api.post('/maintenance', payload).then((r) => r.data);
