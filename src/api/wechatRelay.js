const axios = require('axios');

/**
 * WeChat Work Message Relay Service
 * Handles sending messages to WeChat Work using the corporate API
 */

// Cache for access token (WeChat Work tokens expire every 2 hours)
let accessTokenCache = {
    token: null,
    expiresAt: 0
};

/**
 * Get WeChat Work access token
 * Tokens are cached and automatically refreshed when expired
 */
async function getWeComAccessToken() {
    const corpId = process.env.WECOM_CORP_ID;
    const corpSecret = process.env.WECOM_CORP_SECRET;
    
    if (!corpId || !corpSecret) {
        throw new Error('WeChat Work credentials not configured (WECOM_CORP_ID or WECOM_CORP_SECRET missing)');
    }
    
    // Return cached token if still valid (with 5-minute buffer)
    const now = Date.now();
    if (accessTokenCache.token && now < accessTokenCache.expiresAt - 300000) {
        console.log('Using cached WeChat Work access token');
        return accessTokenCache.token;
    }
    
    try {
        console.log('Fetching new WeChat Work access token');
        const response = await axios.get('https://qyapi.weixin.qq.com/cgi-bin/gettoken', {
            params: {
                corpid: corpId,
                corpsecret: corpSecret
            },
            timeout: 10000 // 10 second timeout
        });
        
        const data = response.data;
        if (data.errcode !== 0) {
            throw new Error(`WeChat Work API error: ${data.errcode} - ${data.errmsg}`);
        }
        
        // Cache the token
        accessTokenCache.token = data.access_token;
        accessTokenCache.expiresAt = now + (data.expires_in * 1000);
        
        console.log('WeChat Work access token obtained successfully');
        return data.access_token;
        
    } catch (error) {
        console.error('Error getting WeChat Work access token:', error.message);
        throw error;
    }
}

/**
 * Send a text message to WeChat Work
 * @param {string} content - Message content to send
 * @param {string} touser - Specific user ID (optional)
 * @param {string} toparty - Department ID (optional, defaults to WECOM_TO_PARTY)
 * @param {string} totag - Tag ID (optional)
 */
async function sendWeComMessage(content, touser = '', toparty = '', totag = '') {
    const agentId = process.env.WECOM_AGENT_ID;
    const defaultParty = process.env.WECOM_TO_PARTY || '1';
    
    if (!agentId) {
        throw new Error('WeChat Work agent ID not configured (WECOM_AGENT_ID missing)');
    }
    
    if (!content || content.trim() === '') {
        throw new Error('Message content cannot be empty');
    }
    
    // Use default party if no specific recipient provided
    if (!touser && !toparty && !totag) {
        toparty = defaultParty;
    }
    
    try {
        const accessToken = await getWeComAccessToken();
        
        const messageData = {
            touser: touser,
            toparty: toparty,
            totag: totag,
            msgtype: 'text',
            agentid: parseInt(agentId),
            text: {
                content: content.trim()
            }
        };
        
        console.log('Sending WeChat Work message:', {
            touser: touser || 'not specified',
            toparty: toparty || 'not specified',
            totag: totag || 'not specified',
            content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
            agentId: agentId
        });
        
        const response = await axios.post(
            `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`,
            messageData,
            {
                timeout: 10000, // 10 second timeout
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const result = response.data;
        if (result.errcode !== 0) {
            throw new Error(`WeChat Work send message error: ${result.errcode} - ${result.errmsg}`);
        }
        
        console.log('WeChat Work message sent successfully:', {
            invaliduser: result.invaliduser || 'none',
            invalidparty: result.invalidparty || 'none',
            invalidtag: result.invalidtag || 'none'
        });
        
        return result;
        
    } catch (error) {
        console.error('Error sending WeChat Work message:', error.message);
        
        // Clear token cache if it's an authentication error
        if (error.message.includes('40014') || error.message.includes('42001')) {
            console.log('Clearing invalid access token from cache');
            accessTokenCache.token = null;
            accessTokenCache.expiresAt = 0;
        }
        
        throw error;
    }
}

/**
 * Send a simple text message to the default department
 * This is the main export function for compatibility
 * @param {string} translatedMessage - The message content to send
 */
async function sendToWeChat(translatedMessage) {
    console.log('Forwarding message to WeChat Work:', translatedMessage);
    return await sendWeComMessage(translatedMessage);
}

/**
 * Send a message to a specific user
 * @param {string} content - Message content
 * @param {string} userId - WeChat Work user ID
 */
async function sendToWeComUser(content, userId) {
    return await sendWeComMessage(content, userId, '', '');
}

/**
 * Send a message to a specific department
 * @param {string} content - Message content
 * @param {string} departmentId - WeChat Work department ID
 */
async function sendToWeComDepartment(content, departmentId) {
    return await sendWeComMessage(content, '', departmentId, '');
}

/**
 * Send a message to users with a specific tag
 * @param {string} content - Message content
 * @param {string} tagId - WeChat Work tag ID
 */
async function sendToWeComTag(content, tagId) {
    return await sendWeComMessage(content, '', '', tagId);
}

// Export the main function for backward compatibility
module.exports = sendToWeChat;

// Export additional functions for advanced usage
module.exports.sendWeComMessage = sendWeComMessage;
module.exports.sendToWeComUser = sendToWeComUser;
module.exports.sendToWeComDepartment = sendToWeComDepartment;
module.exports.sendToWeComTag = sendToWeComTag;
module.exports.getWeComAccessToken = getWeComAccessToken;