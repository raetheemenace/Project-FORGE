const oracledb = require('oracledb');

let pool;

async function initPool() {
  if (pool) return pool;

  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
  oracledb.autoCommit = false; // We manage commits explicitly

  pool = await oracledb.createPool({
    user:             process.env.DB_USER,
    password:         process.env.DB_PASSWORD,
    connectString:    process.env.DB_CONNECTION_STRING,
    poolMin:          2,
    poolMax:          10,
    poolIncrement:    1,
    poolTimeout:      60,
    stmtCacheSize:    30,
  });

  console.log('Oracle connection pool created');
  return pool;
}

async function getConnection() {
  if (!pool) await initPool();
  return pool.getConnection();
}

async function closePool() {
  if (pool) {
    await pool.close(10);
    pool = null;
  }
}

module.exports = { initPool, getConnection, closePool };
