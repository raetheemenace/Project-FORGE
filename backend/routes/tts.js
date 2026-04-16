// TTS Route — POST /api/tts/synthesize
// Invokes AWS Polly to synthesize speech and streams audio back to the client
// Requirements: 11.1, 11.2, 11.5, 16.5
const express = require('express');
const router = express.Router();
const { PollyClient, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly');
const { authenticateToken } = require('../middleware/auth');

const polly = new PollyClient({ region: process.env.AWS_REGION });

/**
 * POST /api/tts/synthesize
 * Body: { text: string, voiceId?: string }
 * Returns: audio/mpeg stream
 * Requirements: 11.1, 11.2, 16.5
 */
router.post('/synthesize', authenticateToken, async (req, res) => {
  const { text, voiceId = 'Joanna' } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'text is required' });
  }

  // Truncate to Polly's 3000-char limit
  const truncated = text.trim().slice(0, 3000);

  const command = new SynthesizeSpeechCommand({
    Text: truncated,
    OutputFormat: 'mp3',
    VoiceId: voiceId,
    Engine: 'neural',
  });

  try {
    const response = await polly.send(command);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');

    // AudioStream is a readable stream — pipe directly to response
    const stream = response.AudioStream;
    if (stream && typeof stream.pipe === 'function') {
      stream.pipe(res);
      stream.on('error', (err) => {
        console.error('Polly stream error:', err);
        if (!res.headersSent) res.status(500).json({ error: 'Audio stream error' });
      });
    } else {
      // Fallback: collect chunks from async iterable
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      res.end(Buffer.concat(chunks));
    }
  } catch (err) {
    console.error('Polly error:', err);
    console.error('Polly error details:', err.message, err.code, err.statusCode);
    res.status(502).json({ error: 'TTS service temporarily unavailable.' });
  }
});

module.exports = router;
