const express = require('express');
const request = require('supertest');
const wechatWebhook = require('./src/api/wechatWebhook');

const app = express();
// Add middleware to handle XML content types
app.use(express.text({ type: 'text/xml' }));
app.use(express.text({ type: 'application/xml' }));
app.use(express.json());
app.use('/webhook/wechat', wechatWebhook);

// Debug test
async function testWeChat() {
    try {
        const response = await request(app)
            .get('/webhook/wechat')
            .query({
                msg_signature: 'test',
                timestamp: '1234567890',
                nonce: 'test_nonce',
                echostr: 'test_echo'
            });
            
        console.log('GET Response Status:', response.status);
        console.log('GET Response Text:', response.text);
        
        const xmlBody = '<xml><Encrypt><![CDATA[test_encrypted]]></Encrypt></xml>';
        const postResponse = await request(app)
            .post('/webhook/wechat')
            .query({
                msg_signature: 'test',
                timestamp: '1234567890',
                nonce: 'test_nonce'
            })
            .set('Content-Type', 'text/xml')
            .send(xmlBody);
            
        console.log('POST Response Status:', postResponse.status);
        console.log('POST Response Text:', postResponse.text);
    } catch (error) {
        console.error('Debug error:', error.message);
    }
}

testWeChat();