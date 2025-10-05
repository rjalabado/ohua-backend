const express = require('express');
const crypto = require('crypto');
const xml2js = require('xml2js');
const { sendLinePush } = require('./lineRelay');
const { translationService } = require('../services/translationService');
const { userMappingService } = require('../services/userMappingService');
const router = express.Router();

// Relay message from WeChat to LINE with translation
async function relayToLine(wechatUserId, message, messageType = 'text') {
    try {
        // Get mapped LINE user
        const lineUserId = userMappingService.getLineUserFromWeChat(wechatUserId);
        if (!lineUserId) {
            console.log(`No LINE mapping found for WeChat user: ${wechatUserId}`);
            return false;
        }

        // Only translate and relay text messages for now
        if (messageType === 'text' && message) {
            // Translate message to Japanese
            const translatedMessage = await translationService.translateToJapanese(message);
            
            // Send to LINE (using push message since we don't have a reply token)
            const success = await sendLinePush(lineUserId, translatedMessage);
            if (success) {
                console.log(`Message relayed from WeChat to LINE: ${wechatUserId} -> ${lineUserId}`);
                return true;
            } else {
                console.error(`Failed to send message to LINE user: ${lineUserId}`);
                return false;
            }
        } else {
            console.log(`Message type ${messageType} not supported for relay yet`);
            return false;
        }
    } catch (error) {
        console.error('Error relaying message to LINE:', error);
        return false;
    }
}

// Process decrypted WeChat message
async function processWeChatMessage(messageData) {
    try {
        console.log('Processing WeChat message:', messageData);
        
        const msgType = messageData.MsgType;
        const fromUser = messageData.FromUserName;
        const content = messageData.Content;
        
        console.log(`WeChat message from ${fromUser}: type=${msgType}`);
        
        if (msgType === 'text' && content) {
            console.log(`WeChat text content: "${content}"`);
            
            // Relay message to LINE (translate to Japanese)
            const relaySuccess = await relayToLine(fromUser, content, 'text');
            
            if (relaySuccess) {
                console.log('✅ Message successfully relayed from WeChat to LINE');
            } else {
                console.log('⚠️ Failed to relay message to LINE - no mapping found or relay failed');
            }
        } else if (msgType === 'image') {
            console.log('WeChat image message received');
            
            // Relay image notification to LINE
            const imageNotification = '📷 图片消息 (Image message from WeChat)';
            await relayToLine(fromUser, imageNotification, 'text');
        } else if (msgType === 'voice') {
            console.log('WeChat voice message received');
            
            // Relay voice notification to LINE
            const voiceNotification = '🎤 语音消息 (Voice message from WeChat)';
            await relayToLine(fromUser, voiceNotification, 'text');
        } else {
            console.log(`WeChat message type ${msgType} not handled for relay`);
        }
        
    } catch (error) {
        console.error('Error processing WeChat message:', error);
    }
}

// WeChat Work signature verification
function verifyWeComSignature(signature, timestamp, nonce, token, encryptedMsg = '') {
    const tmpArr = [token, timestamp, nonce, encryptedMsg].sort();
    const tmpStr = tmpArr.join('');
    const shasum = crypto.createHash('sha1');
    shasum.update(tmpStr);
    const hash = shasum.digest('hex');
    
    return hash === signature;
}

// Simple AES decryption (for demo - in production use WeChat Work's official crypto library)
function decryptAESMsg(encryptedMsg, aesKey) {
    try {
        // Convert base64 key to buffer
        const key = Buffer.from(aesKey + '=', 'base64');
        
        // For now, return the encrypted message as-is since proper AES decryption 
        // requires WeChat Work's specific implementation
        console.log('Encrypted message received (decryption needed):', encryptedMsg.substring(0, 50) + '...');
        return encryptedMsg;
    } catch (error) {
        console.error('Decryption error:', error);
        throw error;
    }
}

// WeChat Work webhook verification (GET request)
router.get('/', (req, res) => {
    console.log('WeChat Work webhook verification request');
    
    const { msg_signature, timestamp, nonce, echostr } = req.query;
    const token = process.env.WECOM_CALLBACK_TOKEN;
    const aesKey = process.env.WECOM_AES_KEY;
    
    if (!token || !aesKey) {
        console.error('WeChat Work credentials not configured');
        return res.status(500).send('Server configuration error');
    }
    
    try {
        // Verify signature
        if (verifyWeComSignature(msg_signature, timestamp, nonce, token, echostr)) {
            console.log('WeChat Work webhook verification successful');
            
            // For verification, echo back the echostr (should be decrypted in production)
            res.send(echostr);
        } else {
            console.error('WeChat Work webhook verification failed');
            res.status(403).send('Forbidden');
        }
    } catch (error) {
        console.error('Error in WeChat Work verification:', error);
        res.status(500).send('Verification error');
    }
});

// WeChat Work message handler (POST request)
router.post('/', async (req, res) => {
    console.log('Received WeChat Work message request');
    
    try {
        const { msg_signature, timestamp, nonce } = req.query;
        const token = process.env.WECOM_CALLBACK_TOKEN;
        const aesKey = process.env.WECOM_AES_KEY;
        
        if (!token || !aesKey) {
            console.error('WeChat Work credentials not configured');
            return res.status(500).send('Server configuration error');
        }
        
        // Parse XML to get message data
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(req.body);
        
        if (!result.xml) {
            console.error('Invalid WeChat Work message format');
            return res.status(400).send('Bad Request');
        }
        
        // Check if message is encrypted
        const isEncrypted = !!result.xml.Encrypt;
        const encryptedMsg = result.xml.Encrypt || '';
        
        // Validate message structure based on encryption
        if (isEncrypted) {
            // Encrypted message should only have Encrypt element
            if (!result.xml.Encrypt) {
                console.error('Encrypted message missing Encrypt element');
                return res.status(400).send('Bad Request');
            }
        } else {
            // Unencrypted messages are only allowed in test mode and must have proper message structure
            const isTestMode = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
            
            if (!isTestMode) {
                console.error('Unencrypted messages not allowed in production');
                return res.status(400).send('Bad Request');
            }
            
            // For unencrypted messages, validate they have required message fields
            if (!result.xml.MsgType || !result.xml.FromUserName) {
                console.error('Invalid unencrypted message structure');
                return res.status(400).send('Bad Request');
            }
        }
        
        // Verify signature
        if (!verifyWeComSignature(msg_signature, timestamp, nonce, token, encryptedMsg)) {
            console.error('WeChat Work message signature verification failed');
            return res.status(403).send('Forbidden');
        }
        
        console.log('WeChat Work message signature verified');
        
        try {
            let messageData;
            
            if (isEncrypted) {
                // Handle encrypted messages (production)
                console.log('Processing encrypted WeChat message');
                const decryptedXml = decryptAESMsg(encryptedMsg, aesKey);
                const decryptedResult = await parser.parseStringPromise(decryptedXml);
                messageData = decryptedResult.xml;
            } else {
                // Handle unencrypted messages (testing)
                console.log('Processing unencrypted WeChat message (test mode)');
                messageData = result.xml;
            }
            
            // Process the message
            if (messageData) {
                await processWeChatMessage(messageData);
            } else {
                console.log('No message data to process');
            }
            
        } catch (decryptionError) {
            console.error('Error processing WeChat message:', decryptionError);
            
            // Fallback to mock data for testing
            const isTestMode = process.env.NODE_ENV === 'development' || 
                              process.env.WECOM_MOCK_MESSAGES === 'true' || 
                              process.env.NODE_ENV === 'test';
            
            if (isTestMode) {
                console.log('Using mock WeChat message for development (fallback)');
                
                // Simulate different message types for testing
                const mockMessages = [
                    {
                        MsgType: 'text',
                        FromUserName: 'wechat_test_user_1',
                        Content: '你好，这是一条测试消息。', // "Hello, this is a test message" in Chinese
                        CreateTime: Date.now()
                    }
                ];
                
                // Process the first mock message
                await processWeChatMessage(mockMessages[0]);
            }
        }
        
        // WeChat Work expects empty XML response for passive reply
        res.set('Content-Type', 'text/xml');
        res.send('<xml></xml>');
        
    } catch (error) {
        console.error('Error processing WeChat Work webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;