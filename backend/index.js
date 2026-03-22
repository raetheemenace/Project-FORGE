const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db/pool');
const authRoutes = require('./routes/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database connection pool
db.initialize()
  .then(() => console.log('Database connection pool initialized'))
  .catch(err => console.error('Failed to initialize database pool:', err));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connectivity
    const result = await db.query('SELECT NOW() as current_time');
    
    res.json({ 
      status: 'Connected', 
      database: 'PostgreSQL 17.6-R2',
      timestamp: result.rows[0].current_time
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'Error', 
      message: err.message 
    });
  }
});

// Authentication routes
app.use('/api/auth', authRoutes);

// AWS Bedrock integration for AI equipment scanner
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

app.post('/api/forge', async (req, res) => {
  const { prompt } = req.body;

  const input = {
    modelId: process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }]
    }),
  };

  try {
    const command = new InvokeModelCommand(input);
    const response = await bedrock.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    res.json({ output: result.content[0].text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`FORGE Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database pool...');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing database pool...');
  await db.close();
  process.exit(0);
});
