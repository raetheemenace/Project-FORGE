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

const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

app.post('/api/forge', express.json(), async (req, res) => {
  const { prompt } = req.body;

  const input = {
    modelId: "anthropic.claude-3-sonnet-20240229-v1:0", // Or your preferred model
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