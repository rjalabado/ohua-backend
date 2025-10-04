require('dotenv').config(); // Load environment variables

const express = require('express');
const lineWebhook = require('./api/lineWebhook');

const app = express();
const port = process.env.PORT || 3000;

// Add JSON parsing middleware
app.use(express.json());

// Register the LINE webhook route
app.use(lineWebhook);

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
