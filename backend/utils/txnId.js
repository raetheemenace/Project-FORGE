const oracledb = require('oracledb');
const { getConnection } = require('../db/pool');

/**
 * Generates a unique Transaction ID in the format TXN-YYYYMMDD-NNN.
 * Counts existing transactions for today to derive the next sequence number.
 * NOTE: caller must hold a row-level lock on the transaction table or use
 * SERIALIZABLE isolation to avoid race conditions under high concurrency.
 */
async function generateTxnId() {
  const conn = await getConnection();
  try {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm   = String(today.getMonth() + 1).padStart(2, '0');
    const dd   = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;

    const result = await conn.execute(
      `SELECT COUNT(*) AS CNT FROM FORGE_TRANSACTIONS
       WHERE TXN_DATE = TRUNC(SYSDATE)`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const seq    = (result.rows[0].CNT || 0) + 1;
    const seqStr = String(seq).padStart(3, '0');
    return `TXN-${dateStr}-${seqStr}`;
  } finally {
    await conn.close();
  }
}

module.exports = { generateTxnId };
