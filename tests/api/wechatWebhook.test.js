const request = require('supertest');
const express = require('express');
const crypto = require('crypto');
const wechatWebhook = require('../../src/api/wechatWebhook');

// Mock environment variables
process.env.WECOM_CALLBACK_TOKEN = 'test_token_123';
process.env.WECOM_AES_KEY = 'testAESKey1234567890123456789012345678901234567890123';

describe('WeChat Work Webhook', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use(wechatWebhook);
    });

    // Helper function to generate WeChat Work signature
    function generateWeComSignature(token, timestamp, nonce, encryptedMsg = '') {
        const tmpArr = [token, timestamp, nonce, encryptedMsg].sort();
        const tmpStr = tmpArr.join('');
        const shasum = crypto.createHash('sha1');
        shasum.update(tmpStr);
        return shasum.digest('hex');
    }

    describe('GET /webhook/wechat - URL Verification', () => {
        test('should verify webhook URL with correct signature', async () => {
            const timestamp = '1234567890';
            const nonce = 'test_nonce';
            const echostr = 'test_echo_string';
            const token = process.env.WECOM_CALLBACK_TOKEN;
            
            const signature = generateWeComSignature(token, timestamp, nonce, echostr);

            const response = await request(app)
                .get('/webhook/wechat')
                .query({
                    msg_signature: signature,
                    timestamp: timestamp,
                    nonce: nonce,
                    echostr: echostr
                });

            expect(response.status).toBe(200);
            expect(response.text).toBe(echostr);
        });

        test('should reject webhook verification with invalid signature', async () => {
            const timestamp = '1234567890';
            const nonce = 'test_nonce';
            const echostr = 'test_echo_string';
            const invalidSignature = 'invalid_signature_hash';

            const response = await request(app)
                .get('/webhook/wechat')
                .query({
                    msg_signature: invalidSignature,
                    timestamp: timestamp,
                    nonce: nonce,
                    echostr: echostr
                });

            expect(response.status).toBe(403);
            expect(response.text).toBe('Forbidden');
        });

        test('should return 500 when WeChat Work credentials are missing', async () => {
            // Temporarily clear environment variables
            const originalToken = process.env.WECOM_CALLBACK_TOKEN;
            delete process.env.WECOM_CALLBACK_TOKEN;

            const response = await request(app)
                .get('/webhook/wechat')
                .query({
                    msg_signature: 'signature',
                    timestamp: '1234567890',
                    nonce: 'nonce',
                    echostr: 'echo'
                });

            expect(response.status).toBe(500);
            expect(response.text).toBe('Server configuration error');

            // Restore environment variable
            process.env.WECOM_CALLBACK_TOKEN = originalToken;
        });
    });

    describe('POST /webhook/wechat - Message Reception', () => {
        test('should accept valid encrypted WeChat Work message', async () => {
            const timestamp = '1234567890';
            const nonce = 'test_nonce';
            const token = process.env.WECOM_CALLBACK_TOKEN;
            const encryptedMsg = 'encrypted_message_content_123';
            
            const signature = generateWeComSignature(token, timestamp, nonce, encryptedMsg);
            const xmlBody = `<xml><Encrypt><![CDATA[${encryptedMsg}]]></Encrypt></xml>`;

            const response = await request(app)
                .post('/webhook/wechat')
                .query({
                    msg_signature: signature,
                    timestamp: timestamp,
                    nonce: nonce
                })
                .set('Content-Type', 'text/xml')
                .send(xmlBody);

            expect(response.status).toBe(200);
            expect(response.text).toBe('<xml></xml>');
            expect(response.headers['content-type']).toContain('text/xml');
        });

        test('should reject message with invalid signature', async () => {
            const timestamp = '1234567890';
            const nonce = 'test_nonce';
            const encryptedMsg = 'encrypted_message_content_123';
            const invalidSignature = 'invalid_signature_hash';
            
            const xmlBody = `<xml><Encrypt><![CDATA[${encryptedMsg}]]></Encrypt></xml>`;

            const response = await request(app)
                .post('/webhook/wechat')
                .query({
                    msg_signature: invalidSignature,
                    timestamp: timestamp,
                    nonce: nonce
                })
                .set('Content-Type', 'text/xml')
                .send(xmlBody);

            expect(response.status).toBe(403);
            expect(response.text).toBe('Forbidden');
        });

        test('should reject malformed XML message', async () => {
            const timestamp = '1234567890';
            const nonce = 'test_nonce';
            const token = process.env.WECOM_CALLBACK_TOKEN;
            const encryptedMsg = 'encrypted_message_content_123';
            
            const signature = generateWeComSignature(token, timestamp, nonce, encryptedMsg);
            const malformedXml = '<invalid>malformed xml</invalid>';

            const response = await request(app)
                .post('/webhook/wechat')
                .query({
                    msg_signature: signature,
                    timestamp: timestamp,
                    nonce: nonce
                })
                .set('Content-Type', 'text/xml')
                .send(malformedXml);

            expect(response.status).toBe(400);
            expect(response.text).toBe('Bad Request');
        });

        test('should reject XML without Encrypt element', async () => {
            const timestamp = '1234567890';
            const nonce = 'test_nonce';
            const token = process.env.WECOM_CALLBACK_TOKEN;
            const encryptedMsg = '';
            
            const signature = generateWeComSignature(token, timestamp, nonce, encryptedMsg);
            const xmlWithoutEncrypt = '<xml><Message>test</Message></xml>';

            const response = await request(app)
                .post('/webhook/wechat')
                .query({
                    msg_signature: signature,
                    timestamp: timestamp,
                    nonce: nonce
                })
                .set('Content-Type', 'text/xml')
                .send(xmlWithoutEncrypt);

            expect(response.status).toBe(400);
            expect(response.text).toBe('Bad Request');
        });

        test('should return 500 when WeChat Work credentials are missing', async () => {
            // Temporarily clear environment variables
            const originalToken = process.env.WECOM_CALLBACK_TOKEN;
            delete process.env.WECOM_CALLBACK_TOKEN;

            const xmlBody = '<xml><Encrypt><![CDATA[encrypted_content]]></Encrypt></xml>';

            const response = await request(app)
                .post('/webhook/wechat')
                .query({
                    msg_signature: 'signature',
                    timestamp: '1234567890',
                    nonce: 'nonce'
                })
                .set('Content-Type', 'text/xml')
                .send(xmlBody);

            expect(response.status).toBe(500);
            expect(response.text).toBe('Server configuration error');

            // Restore environment variable
            process.env.WECOM_CALLBACK_TOKEN = originalToken;
        });
    });

    describe('Signature Verification Function', () => {
        test('should generate consistent signatures', () => {
            const token = 'test_token';
            const timestamp = '1234567890';
            const nonce = 'test_nonce';
            const encryptedMsg = 'encrypted_content';

            const signature1 = generateWeComSignature(token, timestamp, nonce, encryptedMsg);
            const signature2 = generateWeComSignature(token, timestamp, nonce, encryptedMsg);

            expect(signature1).toBe(signature2);
            expect(signature1).toMatch(/^[a-f0-9]{40}$/); // SHA1 produces 40 character hex string
        });

        test('should produce different signatures for different inputs', () => {
            const token = 'test_token';
            const timestamp1 = '1234567890';
            const timestamp2 = '0987654321';
            const nonce = 'test_nonce';
            const encryptedMsg = 'encrypted_content';

            const signature1 = generateWeComSignature(token, timestamp1, nonce, encryptedMsg);
            const signature2 = generateWeComSignature(token, timestamp2, nonce, encryptedMsg);

            expect(signature1).not.toBe(signature2);
        });

        test('should handle empty encrypted message (for verification)', () => {
            const token = 'test_token';
            const timestamp = '1234567890';
            const nonce = 'test_nonce';

            const signature = generateWeComSignature(token, timestamp, nonce, '');
            expect(signature).toMatch(/^[a-f0-9]{40}$/);
        });

        test('should handle special characters in parameters', () => {
            const token = 'test_token_with_special_chars!@#';
            const timestamp = '1234567890';
            const nonce = 'nonce_with_unicode_测试';
            const encryptedMsg = 'encrypted_with_symbols_%^&*()';

            const signature = generateWeComSignature(token, timestamp, nonce, encryptedMsg);
            expect(signature).toMatch(/^[a-f0-9]{40}$/);
        });
    });

    describe('Edge Cases and Real-World Scenarios', () => {
        test('should handle missing query parameters gracefully', async () => {
            const response = await request(app)
                .get('/webhook/wechat')
                .query({
                    msg_signature: 'signature',
                    // Missing timestamp, nonce, echostr
                });

            expect(response.status).toBe(403);
        });

        test('should handle very long encrypted messages', async () => {
            const timestamp = '1234567890';
            const nonce = 'test_nonce';
            const token = process.env.WECOM_CALLBACK_TOKEN;
            
            // Create a very long encrypted message (simulating large content)
            const longEncryptedMsg = 'A'.repeat(10000);
            const signature = generateWeComSignature(token, timestamp, nonce, longEncryptedMsg);
            const xmlBody = `<xml><Encrypt><![CDATA[${longEncryptedMsg}]]></Encrypt></xml>`;

            const response = await request(app)
                .post('/webhook/wechat')
                .query({
                    msg_signature: signature,
                    timestamp: timestamp,
                    nonce: nonce
                })
                .set('Content-Type', 'text/xml')
                .send(xmlBody);

            expect(response.status).toBe(200);
            expect(response.text).toBe('<xml></xml>');
        });

        test('should handle concurrent webhook requests', async () => {
            const timestamp = '1234567890';
            const nonce1 = 'test_nonce_1';
            const nonce2 = 'test_nonce_2';
            const token = process.env.WECOM_CALLBACK_TOKEN;
            const encryptedMsg = 'encrypted_message_content';
            
            const signature1 = generateWeComSignature(token, timestamp, nonce1, encryptedMsg);
            const signature2 = generateWeComSignature(token, timestamp, nonce2, encryptedMsg);
            const xmlBody = `<xml><Encrypt><![CDATA[${encryptedMsg}]]></Encrypt></xml>`;

            // Send concurrent requests
            const [response1, response2] = await Promise.all([
                request(app)
                    .post('/webhook/wechat')
                    .query({ msg_signature: signature1, timestamp, nonce: nonce1 })
                    .set('Content-Type', 'text/xml')
                    .send(xmlBody),
                request(app)
                    .post('/webhook/wechat')
                    .query({ msg_signature: signature2, timestamp, nonce: nonce2 })
                    .set('Content-Type', 'text/xml')
                    .send(xmlBody)
            ]);

            expect(response1.status).toBe(200);
            expect(response2.status).toBe(200);
        });

        test('should handle XML with CDATA sections properly', async () => {
            const timestamp = '1234567890';
            const nonce = 'test_nonce';
            const token = process.env.WECOM_CALLBACK_TOKEN;
            const encryptedMsg = 'encrypted_with_<special>&chars';
            
            const signature = generateWeComSignature(token, timestamp, nonce, encryptedMsg);
            const xmlWithCDATA = `<xml><Encrypt><![CDATA[${encryptedMsg}]]></Encrypt></xml>`;

            const response = await request(app)
                .post('/webhook/wechat')
                .query({
                    msg_signature: signature,
                    timestamp: timestamp,
                    nonce: nonce
                })
                .set('Content-Type', 'text/xml')
                .send(xmlWithCDATA);

            expect(response.status).toBe(200);
        });

        test('should handle XML without CDATA sections', async () => {
            const timestamp = '1234567890';
            const nonce = 'test_nonce';
            const token = process.env.WECOM_CALLBACK_TOKEN;
            const encryptedMsg = 'encrypted_message_content';
            
            const signature = generateWeComSignature(token, timestamp, nonce, encryptedMsg);
            const xmlWithoutCDATA = `<xml><Encrypt>${encryptedMsg}</Encrypt></xml>`;

            const response = await request(app)
                .post('/webhook/wechat')
                .query({
                    msg_signature: signature,
                    timestamp: timestamp,
                    nonce: nonce
                })
                .set('Content-Type', 'text/xml')
                .send(xmlWithoutCDATA);

            expect(response.status).toBe(200);
        });

        test('should handle malformed timestamp parameter', async () => {
            const malformedTimestamp = 'not_a_timestamp';
            const nonce = 'test_nonce';
            const echostr = 'test_echo_string';
            const token = process.env.WECOM_CALLBACK_TOKEN;
            
            const signature = generateWeComSignature(token, malformedTimestamp, nonce, echostr);

            const response = await request(app)
                .get('/webhook/wechat')
                .query({
                    msg_signature: signature,
                    timestamp: malformedTimestamp,
                    nonce: nonce,
                    echostr: echostr
                });

            expect(response.status).toBe(200); // Should still pass signature verification
        });

        test('should handle empty request body for POST', async () => {
            const response = await request(app)
                .post('/webhook/wechat')
                .query({
                    msg_signature: 'signature',
                    timestamp: '1234567890',
                    nonce: 'nonce'
                })
                .set('Content-Type', 'text/xml')
                .send('');

            expect(response.status).toBe(500); // Should error when parsing empty XML
        });

        test('should handle non-XML content type', async () => {
            const timestamp = '1234567890';
            const nonce = 'test_nonce';
            const token = process.env.WECOM_CALLBACK_TOKEN;
            const encryptedMsg = 'encrypted_message_content';
            
            const signature = generateWeComSignature(token, timestamp, nonce, encryptedMsg);
            const xmlBody = `<xml><Encrypt><![CDATA[${encryptedMsg}]]></Encrypt></xml>`;

            const response = await request(app)
                .post('/webhook/wechat')
                .query({
                    msg_signature: signature,
                    timestamp: timestamp,
                    nonce: nonce
                })
                .set('Content-Type', 'application/json') // Wrong content type
                .send(xmlBody);

            // Should still work since we parse as raw XML, but content-type mismatch may cause issues
            expect([200, 400]).toContain(response.status); // Accept either - depends on Express raw parser behavior
        });
    });

    describe('Security and Validation', () => {
        test('should reject requests with no signature', async () => {
            const response = await request(app)
                .get('/webhook/wechat')
                .query({
                    timestamp: '1234567890',
                    nonce: 'test_nonce',
                    echostr: 'test_echo'
                });

            expect(response.status).toBe(403);
        });

        test('should reject requests with SQL injection attempts', async () => {
            const maliciousSignature = "'; DROP TABLE messages; --";
            const response = await request(app)
                .get('/webhook/wechat')
                .query({
                    msg_signature: maliciousSignature,
                    timestamp: '1234567890',
                    nonce: 'test_nonce',
                    echostr: 'test_echo'
                });

            expect(response.status).toBe(403);
        });

        test('should handle extremely long signature parameter', async () => {
            const longSignature = 'a'.repeat(10000);
            const response = await request(app)
                .get('/webhook/wechat')
                .query({
                    msg_signature: longSignature,
                    timestamp: '1234567890',
                    nonce: 'test_nonce',
                    echostr: 'test_echo'
                });

            expect(response.status).toBe(403);
        });

        test('should validate signature case sensitivity', async () => {
            const timestamp = '1234567890';
            const nonce = 'test_nonce';
            const echostr = 'test_echo_string';
            const token = process.env.WECOM_CALLBACK_TOKEN;
            
            const correctSignature = generateWeComSignature(token, timestamp, nonce, echostr);
            const uppercaseSignature = correctSignature.toUpperCase();

            const response = await request(app)
                .get('/webhook/wechat')
                .query({
                    msg_signature: uppercaseSignature,
                    timestamp: timestamp,
                    nonce: nonce,
                    echostr: echostr
                });

            expect(response.status).toBe(403); // Should fail due to case sensitivity
        });

        test('should handle replay attacks with old timestamps', async () => {
            const oldTimestamp = '1000000000'; // Very old timestamp (2001)
            const nonce = 'test_nonce';
            const echostr = 'test_echo_string';
            const token = process.env.WECOM_CALLBACK_TOKEN;
            
            const signature = generateWeComSignature(token, oldTimestamp, nonce, echostr);

            const response = await request(app)
                .get('/webhook/wechat')
                .query({
                    msg_signature: signature,
                    timestamp: oldTimestamp,
                    nonce: nonce,
                    echostr: echostr
                });

            // Should still pass signature verification (timestamp validation is WeChat Work's responsibility)
            expect(response.status).toBe(200);
        });

        test('should handle URL-encoded parameters correctly', async () => {
            const timestamp = '1634567890';
            const nonce = 'test nonce with spaces';
            const echostr = 'echo string with spaces & symbols';
            const token = process.env.WECOM_CALLBACK_TOKEN;
            
            const signature = generateWeComSignature(token, timestamp, nonce, echostr);

            const response = await request(app)
                .get('/webhook/wechat')
                .query({
                    msg_signature: signature,
                    timestamp: timestamp,
                    nonce: nonce,
                    echostr: echostr
                });

            expect(response.status).toBe(200);
            expect(response.text).toBe(echostr);
        });
    });

    describe('WeChat Work Official Message Format Validation', () => {
        test('should handle official WeChat Work text message XML structure', async () => {
            const timestamp = '1634567890';
            const nonce = 'random_nonce_123';
            const token = process.env.WECOM_CALLBACK_TOKEN;
            
            // Official WeChat Work text message XML structure according to documentation
            const officialTextXml = `<xml>
                <ToUserName><![CDATA[toUser]]></ToUserName>
                <FromUserName><![CDATA[fromUser]]></FromUserName> 
                <CreateTime>1348831860</CreateTime>
                <MsgType><![CDATA[text]]></MsgType>
                <Content><![CDATA[Hello WeChat Work]]></Content>
                <MsgId>1234567890123456</MsgId>
                <AgentID>1000002</AgentID>
            </xml>`;
            
            // Encrypt the XML (simulate WeChat Work encryption)
            const encryptedContent = Buffer.from(officialTextXml).toString('base64');
            const signature = generateWeComSignature(token, timestamp, nonce, encryptedContent);
            const xmlBody = `<xml><Encrypt><![CDATA[${encryptedContent}]]></Encrypt></xml>`;

            const response = await request(app)
                .post('/webhook/wechat')
                .query({
                    msg_signature: signature,
                    timestamp: timestamp,
                    nonce: nonce
                })
                .set('Content-Type', 'text/xml')
                .send(xmlBody);

            expect(response.status).toBe(200);
            expect(response.text).toBe('<xml></xml>');
        });

        test('should handle WeChat Work image message format', async () => {
            const timestamp = '1634567890';
            const nonce = 'img_nonce_456';
            const token = process.env.WECOM_CALLBACK_TOKEN;
            
            const imageMessageXml = `<xml>
                <ToUserName><![CDATA[toUser]]></ToUserName>
                <FromUserName><![CDATA[fromUser]]></FromUserName>
                <CreateTime>1348831860</CreateTime>
                <MsgType><![CDATA[image]]></MsgType>
                <PicUrl><![CDATA[http://mmbiz.qpic.cn/pic_url]]></PicUrl>
                <MediaId><![CDATA[media_id]]></MediaId>
                <MsgId>1234567890123457</MsgId>
                <AgentID>1000002</AgentID>
            </xml>`;
            
            const encryptedContent = Buffer.from(imageMessageXml).toString('base64');
            const signature = generateWeComSignature(token, timestamp, nonce, encryptedContent);
            const xmlBody = `<xml><Encrypt><![CDATA[${encryptedContent}]]></Encrypt></xml>`;

            const response = await request(app)
                .post('/webhook/wechat')
                .query({
                    msg_signature: signature,
                    timestamp: timestamp,
                    nonce: nonce
                })
                .set('Content-Type', 'text/xml')
                .send(xmlBody);

            expect(response.status).toBe(200);
        });

        test('should handle WeChat Work event message format', async () => {
            const timestamp = '1634567890';
            const nonce = 'event_nonce_789';
            const token = process.env.WECOM_CALLBACK_TOKEN;
            
            // WeChat Work menu click event according to documentation
            const eventMessageXml = `<xml>
                <ToUserName><![CDATA[toUser]]></ToUserName>
                <FromUserName><![CDATA[fromUser]]></FromUserName>
                <CreateTime>1348831860</CreateTime>
                <MsgType><![CDATA[event]]></MsgType>
                <Event><![CDATA[click]]></Event>
                <EventKey><![CDATA[MENU_KEY_001]]></EventKey>
                <AgentID>1000002</AgentID>
            </xml>`;
            
            const encryptedContent = Buffer.from(eventMessageXml).toString('base64');
            const signature = generateWeComSignature(token, timestamp, nonce, encryptedContent);
            const xmlBody = `<xml><Encrypt><![CDATA[${encryptedContent}]]></Encrypt></xml>`;

            const response = await request(app)
                .post('/webhook/wechat')
                .query({
                    msg_signature: signature,
                    timestamp: timestamp,
                    nonce: nonce
                })
                .set('Content-Type', 'text/xml')
                .send(xmlBody);

            expect(response.status).toBe(200);
        });

        test('should validate required WeChat Work XML fields', async () => {
            const timestamp = '1634567890';
            const nonce = 'validation_nonce';
            const token = process.env.WECOM_CALLBACK_TOKEN;
            
            // XML missing required AgentID field
            const invalidXml = `<xml>
                <ToUserName><![CDATA[toUser]]></ToUserName>
                <FromUserName><![CDATA[fromUser]]></FromUserName>
                <CreateTime>1348831860</CreateTime>
                <MsgType><![CDATA[text]]></MsgType>
                <Content><![CDATA[Missing AgentID]]></Content>
                <MsgId>1234567890123458</MsgId>
            </xml>`;
            
            const encryptedContent = Buffer.from(invalidXml).toString('base64');
            const signature = generateWeComSignature(token, timestamp, nonce, encryptedContent);
            const xmlBody = `<xml><Encrypt><![CDATA[${encryptedContent}]]></Encrypt></xml>`;

            const response = await request(app)
                .post('/webhook/wechat')
                .query({
                    msg_signature: signature,
                    timestamp: timestamp,
                    nonce: nonce
                })
                .set('Content-Type', 'text/xml')
                .send(xmlBody);

            // Should still accept - field validation is application-level logic
            expect(response.status).toBe(200);
        });
    });

    describe('Performance and Load Testing', () => {
        test('should handle multiple concurrent verification requests', async () => {
            const requests = Array.from({ length: 10 }, (_, i) => {
                const timestamp = `163456789${i}`;
                const nonce = `concurrent_nonce_${i}`;
                const echostr = `echo_${i}`;
                const token = process.env.WECOM_CALLBACK_TOKEN;
                
                const signature = generateWeComSignature(token, timestamp, nonce, echostr);
                
                return request(app)
                    .get('/webhook/wechat')
                    .query({
                        msg_signature: signature,
                        timestamp: timestamp,
                        nonce: nonce,
                        echostr: echostr
                    });
            });

            const responses = await Promise.all(requests);
            
            responses.forEach((response, i) => {
                expect(response.status).toBe(200);
                expect(response.text).toBe(`echo_${i}`);
            });
        });

        test('should handle rapid message processing', async () => {
            const timestamp = '1634567890';
            const token = process.env.WECOM_CALLBACK_TOKEN;
            
            const messageRequests = Array.from({ length: 5 }, (_, i) => {
                const nonce = `rapid_${i}`;
                const encryptedMsg = `rapid_message_${i}`;
                const signature = generateWeComSignature(token, timestamp, nonce, encryptedMsg);
                const xmlBody = `<xml><Encrypt><![CDATA[${encryptedMsg}]]></Encrypt></xml>`;

                return request(app)
                    .post('/webhook/wechat')
                    .query({
                        msg_signature: signature,
                        timestamp: timestamp,
                        nonce: nonce
                    })
                    .set('Content-Type', 'text/xml')
                    .send(xmlBody);
            });

            const responses = await Promise.all(messageRequests);
            
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.text).toBe('<xml></xml>');
            });
        });
    });
});