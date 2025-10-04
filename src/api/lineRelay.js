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
        const response = await axios.post('https://api.line.me/v2/bot/message/reply', {
            replyToken: replyToken,
            messages: [
                {
                    type: 'text',
                    text: message
                }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${channelAccessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Reply sent to LINE successfully: "${message}"`);
        return response.data;
    } catch (error) {
        console.error('Error sending reply to LINE:', error.response?.data || error.message);
        return null;
    }
}

module.exports = {
    sendLineReply
};