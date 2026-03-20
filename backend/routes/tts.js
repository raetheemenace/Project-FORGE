const express = require('express');
const { PollyClient, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const polly = new PollyClient({ region: process.env.AWS_REGION });

// POST /api/tts/synthesize
// Body: { text: string, voiceId?: string }
router.post('/synthesize', verifyToken, async (req, res) => {
  const { text, voiceId } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  try {
    const command = new SynthesizeSpeechCommand({
      Text:         text.substring(0, 3000), // Polly limit
      OutputFormat: 'mp3',
      VoiceId:      voiceId || 'Joanna',
      Engine:       'neural',
    });

    const response = await polly.send(command);

    // Stream audio back to client
    res.set('Content-Type', 'audio/mpeg');
    response.AudioStream.pipe(res);
  } catch (err) {
    console.error('Polly TTS error:', err);
    res.status(503).json({ error: 'TTS service unavailable' });
  }
});

module.exports = router;
