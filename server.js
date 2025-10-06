require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import webhook handlers
const lineWebhook = require('./src/api/lineWebhook');
const wechatWebhook = require('./src/api/wechatWebhook');

const app = express();

// Configure CORS for Azure
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-domain.com'] // Replace with your actual domain
        : true,
    credentials: true
}));

// Health check endpoint for Azure
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'OHUA Backend - LINE-WeChat Translation Relay System',
        status: 'running',
        endpoints: {
            line: '/webhook/line',
            wechat: '/webhook/wechat',
            health: '/health'
        }
    });
});

// Mount webhook routes
app.use('/webhook/line', lineWebhook);
app.use('/webhook/wechat', wechatWebhook);

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// Start server
const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
    console.log(`🚀 OHUA Backend server running on port ${port}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 LINE webhook: /webhook/line`);
    console.log(`💬 WeChat webhook: /webhook/wechat`);
    console.log(`❤️ Health check: /health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📴 SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
    });
});

module.exports = app;