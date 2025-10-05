const axios = require('axios');

// Send reply message to LINE
async function sendLineReply(replyToken, message) {
    // Validate inputs
    if (!replyToken) {
        console.error('Reply token is required');
        return null;
    }
    
    if (!message) {
        console.error('Message is required');
        return null;
    }
    
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!channelAccessToken) {
        console.error('LINE_CHANNEL_ACCESS_TOKEN not configured');
        return null;
    }

    try {
        // Support both string messages and message objects
        const messages = Array.isArray(message) ? message : [
            typeof message === 'string' ? { type: 'text', text: message } : message
        ];

        const response = await axios.post('https://api.line.me/v2/bot/message/reply', {
            replyToken: replyToken,
            messages: messages
        }, {
            headers: {
                'Authorization': `Bearer ${channelAccessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log(`Reply sent to LINE successfully`);
        return response.data;
    } catch (error) {
        console.error('Error sending reply to LINE:', error.response?.data || error.message);
        return null;
    }
}

// Send push message to LINE (can be sent anytime, not just as reply)
async function sendLinePush(to, message) {
    // Validate inputs
    if (!to) {
        console.error('Recipient (to) is required');
        return null;
    }
    
    if (!message) {
        console.error('Message is required');
        return null;
    }
    
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!channelAccessToken) {
        console.error('LINE_CHANNEL_ACCESS_TOKEN not configured');
        return null;
    }

    try {
        // Support both string messages and message objects
        const messages = Array.isArray(message) ? message : [
            typeof message === 'string' ? { type: 'text', text: message } : message
        ];

        const response = await axios.post('https://api.line.me/v2/bot/message/push', {
            to: to,
            messages: messages
        }, {
            headers: {
                'Authorization': `Bearer ${channelAccessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log(`Push message sent to LINE successfully`);
        return response.data;
    } catch (error) {
        console.error('Error sending push message to LINE:', error.response?.data || error.message);
        return null;
    }
}

// Send multicast message to multiple users
async function sendLineMulticast(to, message) {
    // Validate inputs
    if (!to || !Array.isArray(to) || to.length === 0) {
        console.error('Recipients array (to) is required');
        return null;
    }
    
    if (!message) {
        console.error('Message is required');
        return null;
    }
    
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!channelAccessToken) {
        console.error('LINE_CHANNEL_ACCESS_TOKEN not configured');
        return null;
    }

    try {
        // Support both string messages and message objects
        const messages = Array.isArray(message) ? message : [
            typeof message === 'string' ? { type: 'text', text: message } : message
        ];

        const response = await axios.post('https://api.line.me/v2/bot/message/multicast', {
            to: to,
            messages: messages
        }, {
            headers: {
                'Authorization': `Bearer ${channelAccessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log(`Multicast message sent to LINE successfully`);
        return response.data;
    } catch (error) {
        console.error('Error sending multicast message to LINE:', error.response?.data || error.message);
        return null;
    }
}

// Get user profile
async function getLineUserProfile(userId) {
    if (!userId) {
        console.error('User ID is required');
        return null;
    }
    
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!channelAccessToken) {
        console.error('LINE_CHANNEL_ACCESS_TOKEN not configured');
        return null;
    }

    try {
        const response = await axios.get(`https://api.line.me/v2/bot/profile/${userId}`, {
            headers: {
                'Authorization': `Bearer ${channelAccessToken}`
            },
            timeout: 10000
        });

        console.log(`Retrieved profile for user: ${userId}`);
        return response.data;
    } catch (error) {
        console.error('Error getting user profile from LINE:', error.response?.data || error.message);
        return null;
    }
}

// Get message content (for images, videos, audio, files)
async function getLineMessageContent(messageId) {
    if (!messageId) {
        console.error('Message ID is required');
        return null;
    }
    
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!channelAccessToken) {
        console.error('LINE_CHANNEL_ACCESS_TOKEN not configured');
        return null;
    }

    try {
        const response = await axios.get(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
            headers: {
                'Authorization': `Bearer ${channelAccessToken}`
            },
            responseType: 'stream',
            timeout: 30000
        });

        console.log(`Retrieved content for message: ${messageId}`);
        return response.data;
    } catch (error) {
        console.error('Error getting message content from LINE:', error.response?.data || error.message);
        return null;
    }
}

// Helper functions to create different message types
const createTextMessage = (text) => ({ type: 'text', text });

const createStickerMessage = (packageId, stickerId) => ({
    type: 'sticker',
    packageId: packageId.toString(),
    stickerId: stickerId.toString()
});

const createImageMessage = (originalContentUrl, previewImageUrl) => ({
    type: 'image',
    originalContentUrl,
    previewImageUrl
});

const createVideoMessage = (originalContentUrl, previewImageUrl) => ({
    type: 'video',
    originalContentUrl,
    previewImageUrl
});

const createAudioMessage = (originalContentUrl, duration) => ({
    type: 'audio',
    originalContentUrl,
    duration
});

const createLocationMessage = (title, address, latitude, longitude) => ({
    type: 'location',
    title,
    address,
    latitude,
    longitude
});

module.exports = {
    sendLineReply,
    sendLinePush,
    sendLineMulticast,
    getLineUserProfile,
    getLineMessageContent,
    createTextMessage,
    createStickerMessage,
    createImageMessage,
    createVideoMessage,
    createAudioMessage,
    createLocationMessage
};