// PostgreSQL Database Connection Pool Configuration
const { Pool } = require('pg');

// Connection pool configuration
const poolConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_CONNECTION_STRING,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'forge',
  max: 10,
  min: 1,                          // Keep at least 1 idle connection ready
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,  // 10s — gives RDS time to respond from cold start
  ssl: {
    rejectUnauthorized: false       // Required for AWS RDS
  }
};

let pool;

/**
 * Initialize the PostgreSQL connection pool with retry logic.
 * Retries up to 5 times with 3-second delays before giving up.
 */
async function initialize(retries = 5, delayMs = 3000) {
  pool = new Pool(poolConfig);

  // Surface pool-level errors so they don't crash the process silently
  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err.message);
  });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      console.log('PostgreSQL connection pool created successfully');
      client.release();
      return; // connected — done
    } catch (err) {
      console.error(`DB connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt < retries) {
        console.log(`Retrying in ${delayMs / 1000}s…`);
        await new Promise((res) => setTimeout(res, delayMs));
      } else {
        console.error('All DB connection attempts failed. Check RDS host, credentials, and VPC/security group settings.');
        throw err;
      }
    }
  }
}

/**
 * Get a connection from the pool
 * @returns {Promise<PoolClient>}
 */
async function getConnection() {
  if (!pool) {
    throw new Error('Connection pool not initialized. Call initialize() first.');
  }
  return await pool.connect();
}

/**
 * Execute a query directly (for simple queries)
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<QueryResult>}
 */
async function query(text, params) {
  if (!pool) {
    throw new Error('Connection pool not initialized. Call initialize() first.');
  }
  return await pool.query(text, params);
}

/**
 * Close the connection pool
 * @returns {Promise<void>}
 */
async function close() {
  if (pool) {
    try {
      await pool.end();
      console.log('PostgreSQL connection pool closed');
    } catch (err) {
      console.error('Error closing PostgreSQL connection pool:', err);
      throw err;
    }
  }
}

/**
 * Get pool statistics
 * @returns {object|null}
 */
function getPoolStatistics() {
  if (!pool) return null;
  
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  };
}

module.exports = {
  initialize,
  getConnection,
  query,
  close,
  getPoolStatistics
};
