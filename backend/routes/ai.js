// AI Q&A Route — POST /api/ai/chat
// Invokes AWS Bedrock Claude 3 to answer lab-related questions
const express = require('express');
const router = express.Router();
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { authenticateToken } = require('../middleware/auth');

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

const SYSTEM_PROMPT =
  'You are a helpful assistant for the FORGE lab equipment management system. ' +
  'Answer questions about equipment borrowing procedures, lab policies, equipment availability, ' +
  'and general lab Q&A. Be concise and helpful.';

/**
 * POST /api/ai/chat
 * Body: { question: string }
 * Returns: { answer: string }
 * Requirements: 2.2
 */
router.post('/chat', authenticateToken, async (req, res) => {
  const { question } = req.body;

  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }

  const bedrockInput = {
    modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: question.trim() }],
    }),
  };

  try {
    const command = new InvokeModelCommand(bedrockInput);
    const response = await bedrock.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    const answer = result.content[0].text;
    return res.json({ answer });
  } catch (err) {
    console.error('Bedrock AI chat error:', err);

    if (err.name === 'ThrottlingException') {
      return res.status(429).json({ error: 'Too many requests. Please wait and try again.' });
    }
    if (err.name === 'ValidationException') {
      return res.status(400).json({ error: 'Invalid request. Please rephrase your question.' });
    }
    return res.status(502).json({ error: 'AI assistant is temporarily unavailable.' });
  }
});

module.exports = router;
