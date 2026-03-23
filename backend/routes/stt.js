// STT Route — POST /api/stt/transcribe
// Accepts a base64-encoded audio blob and transcribes it via AWS Transcribe Streaming
// Requirements: 11.3, 11.4, 11.5, 16.6
const express = require('express');
const router = express.Router();
const {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
} = require('@aws-sdk/client-transcribe-streaming');
const { authenticateToken } = require('../middleware/auth');
const { Readable } = require('stream');

const transcribe = new TranscribeStreamingClient({ region: process.env.AWS_REGION });

/**
 * POST /api/stt/transcribe
 * Body: { audioBase64: string, languageCode?: string, mediaSampleRateHertz?: number }
 * Returns: { transcript: string }
 * Requirements: 11.3, 11.4, 16.6
 */
router.post('/transcribe', authenticateToken, async (req, res) => {
  const {
    audioBase64,
    languageCode = 'en-US',
    mediaSampleRateHertz = 16000,
  } = req.body;

  if (!audioBase64 || typeof audioBase64 !== 'string') {
    return res.status(400).json({ error: 'audioBase64 is required' });
  }

  const audioBuffer = Buffer.from(audioBase64, 'base64');

  // Wrap the buffer in an async generator that yields audio events
  async function* audioStream() {
    const chunkSize = 8192;
    for (let offset = 0; offset < audioBuffer.length; offset += chunkSize) {
      yield { AudioEvent: { AudioChunk: audioBuffer.slice(offset, offset + chunkSize) } };
    }
  }

  const command = new StartStreamTranscriptionCommand({
    LanguageCode: languageCode,
    MediaEncoding: 'pcm',
    MediaSampleRateHertz: mediaSampleRateHertz,
    AudioStream: audioStream(),
  });

  try {
    const response = await transcribe.send(command);

    let transcript = '';
    for await (const event of response.TranscriptResultStream) {
      const results = event?.TranscriptEvent?.Transcript?.Results ?? [];
      for (const result of results) {
        if (!result.IsPartial) {
          transcript += (result.Alternatives?.[0]?.Transcript ?? '') + ' ';
        }
      }
    }

    res.json({ transcript: transcript.trim() });
  } catch (err) {
    console.error('Transcribe error:', err);
    res.status(502).json({ error: 'STT service temporarily unavailable.' });
  }
});

module.exports = router;
