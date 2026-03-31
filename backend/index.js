const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db/pool');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const scannerRoutes = require('./routes/scanner');
const transactionRoutes = require('./routes/transactions');
const maintenanceRoutes = require('./routes/maintenance');
const ttsRoutes = require('./routes/tts');
const sttRoutes = require('./routes/stt');
const equipmentRoutes = require('./routes/equipment');
const adminAnalyticsRoutes = require('./routes/admin/analytics');
const adminEquipmentRoutes = require('./routes/admin/equipment');
const adminTransactionRoutes = require('./routes/admin/transactions');
const adminTicketRoutes = require('./routes/admin/tickets');
const adminUserRoutes = require('./routes/admin/users');
const adminRoomRoutes = require('./routes/admin/rooms');
const adminSystemReportsRoutes = require('./routes/admin/systemReports');
const adminQRCodeRoutes = require('./routes/admin/qrcode');
const adminAcquisitionsRoutes = require('./routes/admin/acquisitions');
const aiRoutes = require('./routes/ai');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for image uploads
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize database connection pool
db.initialize()
  .then(() => console.log('Database connection pool initialized'))
  .catch(err => {
    console.error('Failed to initialize database pool:', err.message);
    console.error('Server will continue running — DB-dependent routes will return 503 until connection is restored.');
  });

// Root health check endpoint for ELB
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

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

// Dashboard routes
app.use('/api/dashboard', dashboardRoutes);

// Scanner routes
app.use('/api/scanner', scannerRoutes);

// Transaction routes
app.use('/api/transactions', transactionRoutes);

// Maintenance routes
app.use('/api/maintenance', maintenanceRoutes);

// TTS routes (AWS Polly)
app.use('/api/tts', ttsRoutes);

// STT routes (AWS Transcribe)
app.use('/api/stt', sttRoutes);

// Equipment routes (S3 image URLs)
app.use('/api/equipment', equipmentRoutes);

// Admin routes
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/equipment', adminEquipmentRoutes);
app.use('/api/admin/transactions', adminTransactionRoutes);
app.use('/api/admin/tickets', adminTicketRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/rooms', adminRoomRoutes);
app.use('/api/admin/system-reports', adminSystemReportsRoutes);
app.use('/api/admin/qrcode', adminQRCodeRoutes);
app.use('/api/admin/acquisitions', adminAcquisitionsRoutes);

// AI Q&A routes (AWS Bedrock Claude 3)
app.use('/api/ai', aiRoutes);

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
const PORT = process.env.PORT || 8080;
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
