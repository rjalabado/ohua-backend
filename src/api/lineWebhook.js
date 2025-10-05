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
const axios = require('axios');

// Handle different message types
async function handleMessageEvent(event) {
    const messageType = event.message.type;
    const userId = event.source?.userId;
    const messageId = event.message.id;
    
    console.log(`Received ${messageType} message from user: ${userId}`);
    
    switch (messageType) {
        case 'text':
            console.log(`Text content: "${event.message.text}"`);
            if (event.message.mention) {
                console.log('Message contains mentions:', event.message.mention);
            }
            if (event.message.quotedMessageId) {
                console.log('Message quotes another message:', event.message.quotedMessageId);
            }
            
            // Send echo reply for text messages
            const replyMessage = `Echo: ${event.message.text}`;
            await sendLineReply(event.replyToken, replyMessage);
            break;
            
        case 'image':
            console.log(`Image message - ID: ${messageId}`);
            if (event.message.contentProvider?.type === 'line') {
                console.log('Image stored on LINE servers - can be retrieved via API');
            }
            await sendLineReply(event.replyToken, 'I received your image! 📷');
            break;
            
        case 'video':
            console.log(`Video message - ID: ${messageId}, Duration: ${event.message.duration}ms`);
            if (event.message.contentProvider?.type === 'line') {
                console.log('Video stored on LINE servers - can be retrieved via API');
            }
            await sendLineReply(event.replyToken, 'I received your video! 🎥');
            break;
            
        case 'audio':
            console.log(`Audio message - ID: ${messageId}, Duration: ${event.message.duration}ms`);
            if (event.message.contentProvider?.type === 'line') {
                console.log('Audio stored on LINE servers - can be retrieved via API');
            }
            await sendLineReply(event.replyToken, 'I received your voice message! 🎵');
            break;
            
        case 'file':
            console.log(`File message - ID: ${messageId}, Filename: ${event.message.fileName}, Size: ${event.message.fileSize} bytes`);
            await sendLineReply(event.replyToken, `I received your file: ${event.message.fileName} 📁`);
            break;
            
        case 'location':
            const { title, address, latitude, longitude } = event.message;
            console.log(`Location message - Title: ${title}, Address: ${address}, Coords: ${latitude},${longitude}`);
            await sendLineReply(event.replyToken, `I received your location: ${title || address} 📍`);
            break;
            
        case 'sticker':
            console.log(`Sticker message - Package ID: ${event.message.packageId}, Sticker ID: ${event.message.stickerId}`);
            if (event.message.stickerResourceType) {
                console.log(`Sticker type: ${event.message.stickerResourceType}`);
            }
            if (event.message.keywords) {
                console.log(`Sticker keywords: ${event.message.keywords.join(', ')}`);
            }
            await sendLineReply(event.replyToken, 'Nice sticker! 😄');
            break;
            
        default:
            console.log(`Unsupported message type: ${messageType}`);
            await sendLineReply(event.replyToken, 'I received your message, but I don\'t know how to handle this type yet.');
    }
}

// Handle follow events (user adds bot as friend)
async function handleFollowEvent(event) {
    const userId = event.source?.userId;
    console.log(`User ${userId} followed the bot`);
    
    await sendLineReply(event.replyToken, 'Thank you for adding me as a friend! 👋');
}

// Handle unfollow events (user blocks bot)
async function handleUnfollowEvent(event) {
    const userId = event.source?.userId;
    console.log(`User ${userId} unfollowed the bot`);
    // Cannot reply to unfollow events
}

// Handle join events (bot joins group/room)
async function handleJoinEvent(event) {
    const sourceType = event.source?.type;
    const sourceId = event.source?.groupId || event.source?.roomId;
    console.log(`Bot joined ${sourceType}: ${sourceId}`);
    
    await sendLineReply(event.replyToken, 'Hello everyone! Thanks for adding me to the group! 🎉');
}

// Handle leave events (bot leaves group/room)
async function handleLeaveEvent(event) {
    const sourceType = event.source?.type;
    const sourceId = event.source?.groupId || event.source?.roomId;
    console.log(`Bot left ${sourceType}: ${sourceId}`);
    // Cannot reply to leave events
}

// Handle postback events (user clicks button/action)
async function handlePostbackEvent(event) {
    const userId = event.source?.userId;
    const data = event.postback.data;
    console.log(`User ${userId} triggered postback: ${data}`);
    
    if (event.postback.params) {
        console.log('Postback params:', event.postback.params);
    }
    
    await sendLineReply(event.replyToken, `You clicked: ${data}`);
}

// Handle unsend events (user unsends a message)
async function handleUnsendEvent(event) {
    const userId = event.source?.userId;
    const messageId = event.unsend.messageId;
    console.log(`User ${userId} unsent message: ${messageId}`);
    
    // Handle message deletion in your system
    // Note: Cannot reply to unsend events
}

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
            console.log(`Processing event type: ${event.type}`);
            
            if (event.type === 'message') {
                await handleMessageEvent(event);
            } else if (event.type === 'follow') {
                await handleFollowEvent(event);
            } else if (event.type === 'unfollow') {
                await handleUnfollowEvent(event);
            } else if (event.type === 'join') {
                await handleJoinEvent(event);
            } else if (event.type === 'leave') {
                await handleLeaveEvent(event);
            } else if (event.type === 'postback') {
                await handlePostbackEvent(event);
            } else if (event.type === 'unsend') {
                await handleUnsendEvent(event);
            } else {
                console.log(`Received ${event.type} event (handler not implemented)`);
            }
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Error processing LINE webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;