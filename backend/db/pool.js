// PostgreSQL Database Connection Pool Configuration
const { Pool } = require('pg');

// Connection pool configuration
const poolConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_CONNECTION_STRING,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'forge',
  max: 10,                    // Maximum number of clients in the pool
  min: 2,                     // Minimum number of clients in the pool
  idleTimeoutMillis: 30000,   // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
  ssl: {
    rejectUnauthorized: false  // Required for AWS RDS
  }
};

let pool;

/**
 * Initialize the PostgreSQL connection pool
 * @returns {Promise<void>}
 */
async function initialize() {
  try {
    pool = new Pool(poolConfig);
    
    // Test the connection
    const client = await pool.connect();
    console.log('PostgreSQL connection pool created successfully');
    client.release();
  } catch (err) {
    console.error('Error creating PostgreSQL connection pool:', err);
    throw err;
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
