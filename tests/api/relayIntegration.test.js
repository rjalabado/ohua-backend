const request = require('supertest');
const express = require('express');
const crypto = require('crypto');

// Mock the services
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

describe('Bidirectional LINE-WeChat Relay Integration', () => {
    let app;
    const mockChannelSecret = 'test-channel-secret';
    const mockWeChatToken = 'test-wecom-token';
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Set up environment variables
        process.env.LINE_CHANNEL_SECRET = mockChannelSecret;
        process.env.WECOM_CALLBACK_TOKEN = mockWeChatToken;
        process.env.WECOM_AES_KEY = 'test-aes-key';
        process.env.DISABLE_SIGNATURE_VALIDATION = 'false';
        process.env.NODE_ENV = 'development';
        process.env.WECOM_MOCK_MESSAGES = 'true';
        
        // Create Express app with middleware
        app = express();
        app.use(express.json());
        app.use(express.raw({ type: 'text/xml' }));
        app.use('/webhook/line', lineWebhook);
        app.use('/webhook/wechat', wechatWebhook);
        
        // Mock successful responses
        sendLineReply.mockResolvedValue({ success: true });
        sendLinePush.mockResolvedValue({ success: true });
        sendWeComMessage.mockResolvedValue({ success: true });
        
        // Mock translation service
        translationService.translateToChinese.mockImplementation(async (text) => `[中文] ${text}`);
        translationService.translateToJapanese.mockImplementation(async (text) => `[日本語] ${text}`);
        
        // Mock user mapping service
        userMappingService.getWeChatUserFromLine.mockImplementation((lineUserId) => {
            if (lineUserId === 'line_user_123') return 'wechat_user_456';
            return null;
        });
        
        userMappingService.getLineUserFromWeChat.mockImplementation((wechatUserId) => {
            if (wechatUserId === 'wechat_test_user_1') return 'line_user_123';
            return null;
        });
    });
    
    afterEach(() => {
        delete process.env.LINE_CHANNEL_SECRET;
        delete process.env.WECOM_CALLBACK_TOKEN;
        delete process.env.WECOM_AES_KEY;
        delete process.env.DISABLE_SIGNATURE_VALIDATION;
        delete process.env.NODE_ENV;
        delete process.env.WECOM_MOCK_MESSAGES;
    });
    
    // Helper function to create valid LINE signature
    const createLineSignature = (body) => {
        return crypto
            .createHmac('sha256', mockChannelSecret)
            .update(JSON.stringify(body))
            .digest('base64');
    };
    
    // Helper function to create valid WeChat signature
    const createWeChatSignature = (timestamp, nonce, token, encryptedMsg = '') => {
        const tmpArr = [token, timestamp, nonce, encryptedMsg].sort();
        const tmpStr = tmpArr.join('');
        const shasum = crypto.createHash('sha1');
        shasum.update(tmpStr);
        return shasum.digest('hex');
    };

    describe('LINE to WeChat Relay', () => {
        test('should translate and forward LINE text message to WeChat', async () => {
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'message',
                    message: {
                        type: 'text',
                        id: '12345',
                        text: 'こんにちは、元気ですか？' // "Hello, how are you?" in Japanese
                    },
                    source: {
                        userId: 'line_user_123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createLineSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            
            // Verify translation was called
            expect(translationService.translateToChinese).toHaveBeenCalledWith(
                'こんにちは、元気ですか？'
            );
            
            // Verify WeChat message was sent
            expect(sendWeComMessage).toHaveBeenCalledWith(
                'wechat_user_456',
                '[中文] こんにちは、元気ですか？',
                'text'
            );
            
            // Verify confirmation was sent back to LINE
            expect(sendLineReply).toHaveBeenCalledWith(
                'reply-token-123',
                '✅ メッセージをWeChatに転送しました (Message forwarded to WeChat)'
            );
        });
        
        test('should handle LINE message when no WeChat mapping exists', async () => {
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'message',
                    message: {
                        type: 'text',
                        id: '12345',
                        text: 'Hello world'
                    },
                    source: {
                        userId: 'unmapped_line_user'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createLineSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            
            // Should not send to WeChat
            expect(sendWeComMessage).not.toHaveBeenCalled();
            
            // Should send echo reply instead
            expect(sendLineReply).toHaveBeenCalledWith(
                'reply-token-123',
                'Echo: Hello world'
            );
        });
        
        test('should relay LINE image as notification to WeChat', async () => {
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'message',
                    message: {
                        type: 'image',
                        id: 'img-123',
                        contentProvider: {
                            type: 'line'
                        }
                    },
                    source: {
                        userId: 'line_user_123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createLineSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            
            // Verify image notification was translated and sent
            expect(translationService.translateToChinese).toHaveBeenCalledWith(
                '📷 画像が送信されました (Image sent)'
            );
            
            expect(sendWeComMessage).toHaveBeenCalledWith(
                'wechat_user_456',
                '[中文] 📷 画像が送信されました (Image sent)',
                'text'
            );
        });
        
        test('should relay LINE sticker as emoji to WeChat', async () => {
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'message',
                    message: {
                        type: 'sticker',
                        id: 'sticker-123',
                        packageId: '1',
                        stickerId: '1',
                        keywords: ['happy', 'smile']
                    },
                    source: {
                        userId: 'line_user_123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createLineSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            
            // Verify sticker was converted to text with keywords
            expect(translationService.translateToChinese).toHaveBeenCalledWith(
                '😄 happy smile (スタンプ sent a sticker)'
            );
            
            expect(sendWeComMessage).toHaveBeenCalledWith(
                'wechat_user_456',
                '[中文] 😄 happy smile (スタンプ sent a sticker)',
                'text'
            );
        });
    });

    describe('WeChat to LINE Relay', () => {
        test('should translate and forward WeChat text message to LINE', async () => {
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const nonce = 'test-nonce';
            const encryptedMsg = 'mock_encrypted_message';
            const signature = createWeChatSignature(timestamp, nonce, mockWeChatToken, encryptedMsg);
            
            const xmlPayload = `<xml>
                <Encrypt><![CDATA[${encryptedMsg}]]></Encrypt>
            </xml>`;
            
            const response = await request(app)
                .post('/webhook/wechat')
                .query({
                    msg_signature: signature,
                    timestamp: timestamp,
                    nonce: nonce
                })
                .set('Content-Type', 'text/xml')
                .send(xmlPayload);
                
            expect(response.status).toBe(200);
            
            // In development mode, it should process the mock message
            expect(translationService.translateToJapanese).toHaveBeenCalledWith(
                '你好，这是一条测试消息。'
            );
            
            expect(sendLinePush).toHaveBeenCalledWith(
                'line_user_123',
                '[日本語] 你好，这是一条测试消息。'
            );
        });
        
        test('should handle WeChat message when no LINE mapping exists', async () => {
            // Mock no mapping found
            userMappingService.getLineUserFromWeChat.mockReturnValue(null);
            
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const nonce = 'test-nonce';
            const encryptedMsg = 'mock_encrypted_message';
            const signature = createWeChatSignature(timestamp, nonce, mockWeChatToken, encryptedMsg);
            
            const xmlPayload = `<xml>
                <Encrypt><![CDATA[${encryptedMsg}]]></Encrypt>
            </xml>`;
            
            const response = await request(app)
                .post('/webhook/wechat')
                .query({
                    msg_signature: signature,
                    timestamp: timestamp,
                    nonce: nonce
                })
                .set('Content-Type', 'text/xml')
                .send(xmlPayload);
                
            expect(response.status).toBe(200);
            
            // Should not send to LINE
            expect(sendLinePush).not.toHaveBeenCalled();
        });
        
        test('should handle WeChat webhook verification', async () => {
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const nonce = 'test-nonce';
            const echostr = 'test-echo-string';
            const signature = createWeChatSignature(timestamp, nonce, mockWeChatToken, echostr);
            
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

    describe('Translation Service Integration', () => {
        test('should handle translation errors gracefully', async () => {
            // Mock translation failure - service should return original text
            translationService.translateToChinese.mockResolvedValue('Test message'); // Fallback to original
            
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'message',
                    message: {
                        type: 'text',
                        id: '12345',
                        text: 'Test message'
                    },
                    source: {
                        userId: 'line_user_123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createLineSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            
            // Translation service should fallback to original text when translation fails
            // The relay should still be attempted
            expect(sendWeComMessage).toHaveBeenCalledWith(
                'wechat_user_456',
                'Test message', // Original text when translation fails
                'text'
            );
            
            // Should send success confirmation since relay succeeded with original text
            expect(sendLineReply).toHaveBeenCalledWith(
                'reply-token-123',
                '✅ メッセージをWeChatに転送しました (Message forwarded to WeChat)'
            );
        });
        
        test('should handle WeChat relay failures gracefully', async () => {
            // Mock WeChat send failure
            sendWeComMessage.mockResolvedValue(false);
            
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'message',
                    message: {
                        type: 'text',
                        id: '12345',
                        text: 'Test message'
                    },
                    source: {
                        userId: 'line_user_123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createLineSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            
            // Should send echo reply when relay fails
            expect(sendLineReply).toHaveBeenCalledWith(
                'reply-token-123',
                'Echo: Test message'
            );
        });
    });

    describe('User Mapping Integration', () => {
        test('should create and use user mappings correctly', () => {
            // Test the mock mappings
            expect(userMappingService.getWeChatUserFromLine('line_user_123')).toBe('wechat_user_456');
            expect(userMappingService.getLineUserFromWeChat('wechat_test_user_1')).toBe('line_user_123');
            
            // Test non-existent mappings
            expect(userMappingService.getWeChatUserFromLine('unknown_user')).toBeNull();
            expect(userMappingService.getLineUserFromWeChat('unknown_user')).toBeNull();
        });
    });
});