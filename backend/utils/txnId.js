// Transaction ID utility for FORGE system
// Format: TXN-YYYYMMDD-NNN

/**
 * Format a Date object as YYYYMMDD string.
 * @param {Date} date
 * @returns {string}
 */
function formatDatePart(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * Generate a Transaction ID given a date and sequence number.
 * @param {Date} date - The transaction date.
 * @param {number} sequenceNumber - Daily sequence number (1-999).
 * @returns {string} e.g. "TXN-20260322-001"
 */
function generateTxnId(date, sequenceNumber) {
  const datePart = formatDatePart(date);
  const seqPart = String(sequenceNumber).padStart(3, '0');
  return `TXN-${datePart}-${seqPart}`;
}

/**
 * Query the DB for the count of transactions on the given date and return the next ID.
 * @param {import('pg').Pool} pool - pg Pool instance.
 * @param {Date} date - The transaction date.
 * @returns {Promise<string>} The next Transaction ID.
 */
async function getNextTxnId(pool, date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided to getNextTxnId');
  }
  const datePart = formatDatePart(date);
  // Count existing transactions for this date
  const result = await pool.query(
    'SELECT COUNT(*) AS count FROM forge_transactions WHERE txn_date = $1',
    [datePart]
  );
  const count = parseInt(result.rows[0].count, 10);
  const nextSeq = count + 1;
  return generateTxnId(date, nextSeq);
}

module.exports = { generateTxnId, getNextTxnId };
