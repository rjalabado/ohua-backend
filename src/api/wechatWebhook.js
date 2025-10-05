const express = require('express');
const crypto = require('crypto');
const xml2js = require('xml2js');
const router = express.Router();

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
router.get('/webhook/wechat', (req, res) => {
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
router.post('/webhook/wechat', express.raw({ type: 'text/xml' }), async (req, res) => {
    console.log('Received WeChat Work message request');
    
    try {
        const { msg_signature, timestamp, nonce } = req.query;
        const token = process.env.WECOM_CALLBACK_TOKEN;
        const aesKey = process.env.WECOM_AES_KEY;
        
        if (!token || !aesKey) {
            console.error('WeChat Work credentials not configured');
            return res.status(500).send('Server configuration error');
        }
        
        // Parse XML to get encrypted message
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(req.body);
        
        if (!result.xml || !result.xml.Encrypt) {
            console.error('Invalid WeChat Work message format');
            return res.status(400).send('Bad Request');
        }
        
        const encryptedMsg = result.xml.Encrypt;
        
        // Verify signature with encrypted message
        if (!verifyWeComSignature(msg_signature, timestamp, nonce, token, encryptedMsg)) {
            console.error('WeChat Work message signature verification failed');
            return res.status(403).send('Forbidden');
        }
        
        console.log('WeChat Work message signature verified');
        
        // TODO: Decrypt message content (requires WeChat Work crypto library)
        // const decryptedXml = decryptAESMsg(encryptedMsg, aesKey);
        // const decryptedResult = await parser.parseStringPromise(decryptedXml);
        // const message = decryptedResult.xml;
        
        console.log('Encrypted WeChat Work message received:', {
            timestamp,
            nonce,
            encryptedLength: encryptedMsg.length
        });
        
        // WeChat Work expects empty XML response for passive reply
        res.set('Content-Type', 'text/xml');
        res.send('<xml></xml>');
        
    } catch (error) {
        console.error('Error processing WeChat Work webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;