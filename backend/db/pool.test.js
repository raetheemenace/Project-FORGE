// Basic test to verify pool configuration structure
// Using vitest globals (configured in vitest.config.js)

describe('PostgreSQL Connection Pool Configuration', () => {
  it('should export required functions', () => {
    const pool = require('./pool');
    
    expect(pool).toBeDefined();
    expect(typeof pool.initialize).toBe('function');
    expect(typeof pool.getConnection).toBe('function');
    expect(typeof pool.query).toBe('function');
    expect(typeof pool.close).toBe('function');
    expect(typeof pool.getPoolStatistics).toBe('function');
  });

  it('should throw error when getting connection before initialization', async () => {
    const pool = require('./pool');
    
    await expect(pool.getConnection()).rejects.toThrow(
      'Connection pool not initialized'
    );
  });

  it('should throw error when querying before initialization', async () => {
    const pool = require('./pool');
    
    await expect(pool.query('SELECT 1')).rejects.toThrow(
      'Connection pool not initialized'
    );
  });
});
