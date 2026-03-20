import api from './api.js';

export const identifyEquipment = (imageBase64) =>
  api.post('/scanner/identify', { image: imageBase64 }).then((r) => r.data);
