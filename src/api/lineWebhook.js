const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Middleware to validate X-Line-Signature
function validateLineSignature(req, res, next) {
    // WARNING: Set DISABLE_SIGNATURE_VALIDATION=false in production for security
    if (process.env.DISABLE_SIGNATURE_VALIDATION === 'true') {
        console.log('Signature validation disabled');
        return next();
    }

    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    if (!channelSecret) {
        console.error('LINE_CHANNEL_SECRET not configured');
        return res.status(500).send('Server configuration error');
    }

    const body = JSON.stringify(req.body);
    const signature = crypto
        .createHmac('sha256', channelSecret)
        .update(body)
        .digest('base64');

    if (req.headers['x-line-signature'] !== signature) {
        console.error('Invalid LINE signature - request rejected');
        return res.status(401).send('Unauthorized');
    }
    
    next();
}

const { sendLineReply } = require('./lineRelay');

// LINE webhook handler
router.post('/webhook/line', validateLineSignature, async (req, res) => {
    try {
        console.log('Received LINE webhook event');

        if (!req.body || !req.body.events) {
            console.log('No events in webhook payload');
            return res.status(200).send('OK');
        }

        // Process each event
        for (const event of req.body.events) {
            if (event.type === 'message' && event.message.type === 'text') {
                console.log(`Received text message: "${event.message.text}" from user: ${event.source?.userId}`);
                
                // Send echo reply
                const replyMessage = `Echo: ${event.message.text}`;
                await sendLineReply(event.replyToken, replyMessage);
            } else {
                console.log(`Received ${event.type} event (not processed)`);
            }
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Error processing LINE webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;