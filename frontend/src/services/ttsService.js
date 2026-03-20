import api from './api.js';

export const synthesizeSpeech = async (text) => {
  const { data } = await api.post('/tts/synthesize', { text }, { responseType: 'arraybuffer' });
  return data;
};

export const transcribeVoice = async (audioBase64) => {
  const { data } = await api.post('/stt/transcribe', { audio: audioBase64 });
  return data.text;
};
