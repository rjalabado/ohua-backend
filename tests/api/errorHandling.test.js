const request = require('supertest');
const express = require('express');
const crypto = require('crypto');

// Mock external dependencies
jest.mock('../../src/services/translationService');
jest.mock('../../src/services/userMappingService');
jest.mock('../../src/api/lineRelay');
jest.mock('../../src/api/wechatRelay');

const { translationService } = require('../../src/services/translationService');
const { userMappingService } = require('../../src/services/userMappingService');
const { sendLineReply, sendLinePush } = require('../../src/api/lineRelay');
const { sendWeComMessage } = require('../../src/api/wechatRelay');

const lineWebhook = require('../../src/api/lineWebhook');
const wechatWebhook = require('../../src/api/wechatWebhook');

describe('Enhanced Error Handling and Network Tests', () => {
    let app;
    const mockChannelSecret = 'test-channel-secret';
    const mockWeChatToken = 'test-wecom-token';
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Set up environment variables
        process.env.NODE_ENV = 'test';
        process.env.LINE_CHANNEL_SECRET = mockChannelSecret;
        process.env.WECOM_CALLBACK_TOKEN = mockWeChatToken;
        process.env.WECOM_AES_KEY = 'test-aes-key';
        process.env.WECOM_MOCK_MESSAGES = 'true';
        process.env.DISABLE_SIGNATURE_VALIDATION = 'false'; // Enable validation for testing
        
        // Set up test mappings
        userMappingService.getWeChatUserFromLine.mockImplementation((lineUserId) => {
            if (lineUserId === 'line_user_123') return 'wechat_user_456';
            return null;
        });
        
        userMappingService.getLineUserFromWeChat.mockImplementation((wechatUserId) => {
            if (wechatUserId === 'wechat_user_456') return 'line_user_123';
            return null;
        });
        
        // Mock translation service
        translationService.translateToChinese.mockImplementation((text) => 
            Promise.resolve(`[Chinese] ${text}`)
        );
        translationService.translateToJapanese.mockImplementation((text) => 
            Promise.resolve(`[Japanese] ${text}`)
        );
        
        // Setup Express app with proper middleware order
        app = express();
        // Add body parsing middleware in correct order
        app.use(express.text({ type: 'application/xml', limit: '10mb' }));
        app.use(express.text({ type: 'text/xml', limit: '10mb' }));
        app.use(express.text({ type: 'text/plain', limit: '10mb' }));
        app.use(express.json({ limit: '10mb' }));
        app.use(express.raw({ type: '*/*', limit: '10mb' }));
        // Mount webhook routes
        app.use('/webhook/line', lineWebhook);
        app.use('/webhook/wechat', wechatWebhook);
    });

    describe('Network Failure Scenarios', () => {
        test('should handle translation service timeout', async () => {
            // Mock translation timeout
            translationService.translateToChinese.mockRejectedValue(
                new Error('Request timeout - translation service unavailable')
            );
            
            const mockBody = {
                events: [{
                    type: 'message',
                    replyToken: 'reply-token-123',
                    source: { userId: 'line_user_123' },
                    message: {
                        id: 'msg-123',
                        type: 'text',
                        text: 'Test message for timeout'
                    }
                }]
            };
            
            const signature = crypto
                .createHmac('sha256', mockChannelSecret)
                .update(JSON.stringify(mockBody))
                .digest('base64');
            
            // Should still respond successfully even if translation fails
            const response = await request(app)
                .post('/webhook/line')
                .set('x-line-signature', signature)
                .send(mockBody);
            
            expect(response.status).toBe(200);
            
            // Should fallback to echo reply when translation fails
            expect(sendLineReply).toHaveBeenCalledWith(
                'reply-token-123',
                expect.stringContaining('Echo:')
            );
        });

        test('should handle WeChat relay service failure', async () => {
            // Mock WeChat relay failure
            sendWeComMessage.mockResolvedValue(false);
            
            const mockBody = {
                events: [{
                    type: 'message',
                    replyToken: 'reply-token-123',
                    source: { userId: 'line_user_123' },
                    message: {
                        id: 'msg-123',
                        type: 'text',
                        text: 'Test message for relay failure'
                    }
                }]
            };
            
            const signature = crypto
                .createHmac('sha256', mockChannelSecret)
                .update(JSON.stringify(mockBody))
                .digest('base64');
            
            const response = await request(app)
                .post('/webhook/line')
                .set('x-line-signature', signature)
                .send(mockBody);
            
            expect(response.status).toBe(200);
            
            // Should still send echo reply when relay fails
            expect(sendLineReply).toHaveBeenCalledWith(
                'reply-token-123',
                expect.stringContaining('Echo:')
            );
        });

        test('should handle LINE push message failure', async () => {
            // Mock LINE push failure
            sendLinePush.mockResolvedValue(false);
            
            const mockXmlBody = `
                <xml>
                    <ToUserName><![CDATA[test-corp]]></ToUserName>
                    <FromUserName><![CDATA[wechat_user_456]]></FromUserName>
                    <CreateTime>1234567890</CreateTime>
                    <MsgType><![CDATA[text]]></MsgType>
                    <Content><![CDATA[Test message for LINE failure]]></Content>
                    <MsgId>123456789</MsgId>
                    <AgentID>1000001</AgentID>
                </xml>
            `;
            
            const timestamp = '1234567890';
            const nonce = 'test-nonce';
            // For unencrypted messages, encryptedMsg is empty in signature calculation
            const signature = crypto
                .createHash('sha1')
                .update([mockWeChatToken, timestamp, nonce, ''].sort().join(''))
                .digest('hex');
            
            // Should handle gracefully when LINE relay fails
            const response = await request(app)
                .post('/webhook/wechat')
                .query({
                    msg_signature: signature,
                    timestamp: timestamp,
                    nonce: nonce
                })
                .set('Content-Type', 'text/plain')
                .send(mockXmlBody);
            
            expect(response.status).toBe(200);
        });
    });

    describe('Malformed Request Handling', () => {
        test('should handle invalid JSON in LINE webhook', async () => {
            const invalidJson = '{"events": [{"type": "message", "incomplete": ';
            
            const response = await request(app)
                .post('/webhook/line')
                .set('Content-Type', 'application/json')
                .send(invalidJson);
            
            expect(response.status).toBe(400);
        });

        test('should handle missing required fields in LINE message', async () => {
            const mockBody = {
                events: [{
                    type: 'message',
                    // Missing replyToken, source, and message
                }]
            };
            
            const signature = crypto
                .createHmac('sha256', mockChannelSecret)
                .update(JSON.stringify(mockBody))
                .digest('base64');
            
            const response = await request(app)
                .post('/webhook/line')
                .set('x-line-signature', signature)
                .send(mockBody);
            
            expect(response.status).toBe(200);
            // Should handle gracefully without crashing
        });

        test('should handle invalid XML in WeChat webhook', async () => {
            const invalidXml = '<xml><invalid>unclosed tag</invalid>';
            
            const timestamp = '1234567890';
            const nonce = 'test-nonce';
            const signature = crypto
                .createHash('sha1')
                .update([mockWeChatToken, timestamp, nonce, invalidXml].sort().join(''))
                .digest('hex');
            
            const response = await request(app)
                .post('/webhook/wechat')
                .query({
                    msg_signature: signature,
                    timestamp: timestamp,
                    nonce: nonce
                })
                .set('Content-Type', 'text/plain')
                .send(invalidXml);
            
            // Should handle gracefully
            expect(response.status).toBe(500);
        });

        test('should handle extremely long messages', async () => {
            const longMessage = 'A'.repeat(10000); // 10KB message
            
            const mockBody = {
                events: [{
                    type: 'message',
                    replyToken: 'reply-token-123',
                    source: { userId: 'line_user_123' },
                    message: {
                        id: 'msg-123',
                        type: 'text',
                        text: longMessage
                    }
                }]
            };
            
            const signature = crypto
                .createHmac('sha256', mockChannelSecret)
                .update(JSON.stringify(mockBody))
                .digest('base64');
            
            const response = await request(app)
                .post('/webhook/line')
                .set('x-line-signature', signature)
                .send(mockBody);
            
            expect(response.status).toBe(200);
            
            // Should handle long messages without issues
            expect(translationService.translateToChinese).toHaveBeenCalledWith(longMessage);
        });
    });

    describe('Rate Limiting and Performance', () => {
        test('should handle rapid successive requests', async () => {
            const requests = [];
            const numRequests = 10;
            
            for (let i = 0; i < numRequests; i++) {
                const mockBody = {
                    events: [{
                        type: 'message',
                        replyToken: `reply-token-${i}`,
                        source: { userId: 'line_user_123' },
                        message: {
                            id: `msg-${i}`,
                            type: 'text',
                            text: `Rapid message ${i}`
                        }
                    }]
                };
                
                const signature = crypto
                    .createHmac('sha256', mockChannelSecret)
                    .update(JSON.stringify(mockBody))
                    .digest('base64');
                
                requests.push(
                    request(app)
                        .post('/webhook/line')
                        .set('x-line-signature', signature)
                        .send(mockBody)
                );
            }
            
            const responses = await Promise.all(requests);
            
            // All requests should succeed
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
            
            // Translation service should have been called for each message
            expect(translationService.translateToChinese).toHaveBeenCalledTimes(numRequests);
        });

        test('should handle concurrent translation requests', async () => {
            const messages = [
                'こんにちは',
                'ありがとう',
                'さようなら',
                'おはよう',
                'お疲れ様'
            ];
            
            const requests = messages.map((text, index) => {
                const mockBody = {
                    events: [{
                        type: 'message',
                        replyToken: `reply-token-${index}`,
                        source: { userId: 'line_user_123' },
                        message: {
                            id: `msg-${index}`,
                            type: 'text',
                            text
                        }
                    }]
                };
                
                const signature = crypto
                    .createHmac('sha256', mockChannelSecret)
                    .update(JSON.stringify(mockBody))
                    .digest('base64');
                
                return request(app)
                    .post('/webhook/line')
                    .set('x-line-signature', signature)
                    .send(mockBody);
            });
            
            const startTime = Date.now();
            const responses = await Promise.all(requests);
            const endTime = Date.now();
            
            console.log(`Concurrent requests completed in ${endTime - startTime}ms`);
            
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });
    });

    describe('Memory and Resource Management', () => {
        test('should handle large webhook payloads', async () => {
            // Create a webhook with many events
            const events = [];
            for (let i = 0; i < 100; i++) {
                events.push({
                    type: 'message',
                    replyToken: `reply-token-${i}`,
                    source: { userId: `user-${i}` },
                    message: {
                        id: `msg-${i}`,
                        type: 'text',
                        text: `Bulk message ${i}`
                    }
                });
            }
            
            const mockBody = { events };
            
            const signature = crypto
                .createHmac('sha256', mockChannelSecret)
                .update(JSON.stringify(mockBody))
                .digest('base64');
            
            const response = await request(app)
                .post('/webhook/line')
                .set('x-line-signature', signature)
                .send(mockBody);
            
            expect(response.status).toBe(200);
            
            // Should process all events
            expect(sendLineReply).toHaveBeenCalledTimes(100);
        });

        test('should handle memory pressure with large text content', async () => {
            // Create message with large content (1MB)
            const largeContent = 'Large content '.repeat(70000);
            
            const mockBody = {
                events: [{
                    type: 'message',
                    replyToken: 'reply-token-123',
                    source: { userId: 'line_user_123' },
                    message: {
                        id: 'msg-123',
                        type: 'text',
                        text: largeContent
                    }
                }]
            };
            
            const signature = crypto
                .createHmac('sha256', mockChannelSecret)
                .update(JSON.stringify(mockBody))
                .digest('base64');
            
            const response = await request(app)
                .post('/webhook/line')
                .set('x-line-signature', signature)
                .send(mockBody);
            
            expect(response.status).toBe(200);
            
            // Should handle large content without memory issues
            expect(translationService.translateToChinese).toHaveBeenCalledWith(largeContent);
        });
    });

    describe('Error Recovery and Fallbacks', () => {
        test('should recover from temporary service outages', async () => {
            // First request fails
            translationService.translateToChinese
                .mockRejectedValueOnce(new Error('Service temporarily unavailable'))
                .mockResolvedValueOnce('[Chinese] Hello after recovery');
            
            const mockBody = {
                events: [{
                    type: 'message',
                    replyToken: 'reply-token-123',
                    source: { userId: 'line_user_123' },
                    message: {
                        id: 'msg-123',
                        type: 'text',
                        text: 'Hello'
                    }
                }]
            };
            
            const signature = crypto
                .createHmac('sha256', mockChannelSecret)
                .update(JSON.stringify(mockBody))
                .digest('base64');
            
            // First request - should handle failure gracefully
            const response1 = await request(app)
                .post('/webhook/line')
                .set('x-line-signature', signature)
                .send(mockBody);
            
            expect(response1.status).toBe(200);
            expect(sendLineReply).toHaveBeenCalledWith(
                'reply-token-123',
                expect.stringContaining('Echo:')
            );
            
            // Second request - should work normally
            const secondMockBody = {
                ...mockBody,
                events: [{
                    ...mockBody.events[0],
                    replyToken: 'reply-token-124'
                }]
            };
            
            const secondSignature = crypto
                .createHmac('sha256', mockChannelSecret)
                .update(JSON.stringify(secondMockBody))
                .digest('base64');
            
            const response2 = await request(app)
                .post('/webhook/line')
                .set('x-line-signature', secondSignature)
                .send(secondMockBody);
            
            expect(response2.status).toBe(200);
        });

        test('should handle partial system failures', async () => {
            // Translation works but WeChat relay fails
            sendWeComMessage.mockResolvedValue(false);
            
            const mockBody = {
                events: [{
                    type: 'message',
                    replyToken: 'reply-token-123',
                    source: { userId: 'line_user_123' },
                    message: {
                        id: 'msg-123',
                        type: 'text',
                        text: 'Partial failure test'
                    }
                }]
            };
            
            const signature = crypto
                .createHmac('sha256', mockChannelSecret)
                .update(JSON.stringify(mockBody))
                .digest('base64');
            
            const response = await request(app)
                .post('/webhook/line')
                .set('x-line-signature', signature)
                .send(mockBody);
            
            expect(response.status).toBe(200);
            
            // Should still process translation
            expect(translationService.translateToChinese).toHaveBeenCalled();
            
            // Should still reply to user (echo fallback)
            expect(sendLineReply).toHaveBeenCalledWith(
                'reply-token-123',
                expect.stringContaining('Echo:')
            );
        });
    });

    describe('Security and Validation Edge Cases', () => {
        test('should handle signature validation with special characters', async () => {
            const mockBody = {
                events: [{
                    type: 'message',
                    replyToken: 'reply-token-123',
                    source: { userId: 'line_user_123' },
                    message: {
                        id: 'msg-123',
                        type: 'text',
                        text: 'Message with special chars: 日本語 中文 🎉 @#$%^&*()'
                    }
                }]
            };
            
            const signature = crypto
                .createHmac('sha256', mockChannelSecret)
                .update(JSON.stringify(mockBody))
                .digest('base64');
            
            const response = await request(app)
                .post('/webhook/line')
                .set('x-line-signature', signature)
                .send(mockBody);
            
            expect(response.status).toBe(200);
        });

        test('should reject requests with invalid signature', async () => {
            process.env.DISABLE_SIGNATURE_VALIDATION = 'false';
            
            const mockBody = {
                events: [{
                    type: 'message',
                    replyToken: 'reply-token-123',
                    source: { userId: 'line_user_123' },
                    message: {
                        id: 'msg-123',
                        type: 'text',
                        text: 'Test message'
                    }
                }]
            };
            
            const response = await request(app)
                .post('/webhook/line')
                .set('x-line-signature', 'invalid-signature')
                .send(mockBody);
            
            expect(response.status).toBe(401);
        });

        test('should handle missing signature header', async () => {
            process.env.DISABLE_SIGNATURE_VALIDATION = 'false';
            
            const mockBody = {
                events: [{
                    type: 'message',
                    replyToken: 'reply-token-123',
                    source: { userId: 'line_user_123' },
                    message: {
                        id: 'msg-123',
                        type: 'text',
                        text: 'Test message'
                    }
                }]
            };
            
            const response = await request(app)
                .post('/webhook/line')
                .send(mockBody);
            
            expect(response.status).toBe(401);
        });
    });
});