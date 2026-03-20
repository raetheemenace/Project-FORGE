require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { initPool, closePool } = require('./db/pool');

const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow base64 image payloads

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/dashboard',   require('./routes/dashboard'));
app.use('/api/transactions',require('./routes/transactions'));
app.use('/api/scanner',     require('./routes/scanner'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/equipment',   require('./routes/equipment'));
app.use('/api/tts',         require('./routes/tts'));
app.use('/api/stt',         require('./routes/stt'));

// Admin routes (all require LAB_ADMIN role — enforced per-router)
app.use('/api/admin/equipment',    require('./routes/admin/equipment'));
app.use('/api/admin/transactions', require('./routes/admin/transactions'));
app.use('/api/admin/tickets',      require('./routes/admin/tickets'));
app.use('/api/admin/users',        require('./routes/admin/users'));
app.use('/api/admin/rooms',        require('./routes/admin/rooms'));
app.use('/api/admin/analytics',    require('./routes/admin/analytics'));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const oracledb = require('oracledb');
  let conn;
  try {
    conn = await require('./db/pool').getConnection();
    await conn.execute('SELECT 1 FROM DUAL');
    res.json({ status: 'ok', database: 'Oracle 19c', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// ── 404 fallback ──────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start server ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

initPool()
  .then(() => {
    app.listen(PORT, () => console.log(`FORGE Backend running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to initialize Oracle pool:', err.message);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});
