const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

app.get('/api/health', async (req, res) => {
  let connection;
  try {
    // Basic connectivity test to Oracle 19c
    connection = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECTION_STRING
    });

    res.json({ status: 'Connected', database: 'Oracle 19c RDS' });
  } catch (err) {
    res.status(500).json({ status: 'Error', message: err.message });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`FORGE Backend running on port ${PORT}`));