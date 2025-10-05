require('dotenv').config(); // Load environment variables

const express = require('express');
const lineWebhook = require('./api/lineWebhook');
const wechatWebhook = require('./api/wechatWebhook');

const app = express();
const port = process.env.PORT || 3000;

// Add JSON parsing middleware
app.use(express.json());

// Register webhook routes
app.use(lineWebhook);
app.use(wechatWebhook);

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
