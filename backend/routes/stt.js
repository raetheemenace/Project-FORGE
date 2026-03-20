const express = require('express');
const {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
} = require('@aws-sdk/client-transcribe');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { verifyToken } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();
const transcribe = new TranscribeClient({ region: process.env.AWS_REGION });
const s3 = new S3Client({ region: process.env.AWS_REGION });

// POST /api/stt/transcribe
// Body: { audioBase64: string, mimeType?: string }
router.post('/transcribe', verifyToken, async (req, res) => {
  const { audioBase64, mimeType } = req.body;
  if (!audioBase64) return res.status(400).json({ error: 'audioBase64 is required' });

  const jobName = `forge-stt-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const s3Key   = `stt-audio/${jobName}.webm`;
  const bucket  = process.env.S3_BUCKET;

  try {
    // Upload audio to S3 for Transcribe to process
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    await s3.send(new PutObjectCommand({
      Bucket:      bucket,
      Key:         s3Key,
      Body:        audioBuffer,
      ContentType: mimeType || 'audio/webm',
    }));

    // Start transcription job
    await transcribe.send(new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      LanguageCode:         'en-US',
      MediaFormat:          'webm',
      Media:                { MediaFileUri: `s3://${bucket}/${s3Key}` },
    }));

    // Poll for completion (max 10 seconds)
    let transcript = null;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const status = await transcribe.send(new GetTranscriptionJobCommand({ TranscriptionJobName: jobName }));
      const jobStatus = status.TranscriptionJob.TranscriptionJobStatus;

      if (jobStatus === 'COMPLETED') {
        const url = status.TranscriptionJob.Transcript.TranscriptFileUri;
        const fetch = (await import('node-fetch')).default;
        const data  = await (await fetch(url)).json();
        transcript  = data.results.transcripts[0].transcript;
        break;
      }
      if (jobStatus === 'FAILED') break;
    }

    if (!transcript) {
      return res.status(504).json({ error: 'Transcription timed out or failed' });
    }

    res.json({ transcript });
  } catch (err) {
    console.error('STT error:', err);
    res.status(503).json({ error: 'STT service unavailable' });
  }
});

module.exports = router;
