const request = require('supertest');
const express = require('express');
const crypto = require('crypto');

// Mock the lineRelay module
jest.mock('../../src/api/lineRelay');
const { sendLineReply } = require('../../src/api/lineRelay');

const lineWebhook = require('../../src/api/lineWebhook');

describe('LINE Webhook', () => {
    let app;
    const mockChannelSecret = 'test-channel-secret';
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Set up environment variables
        process.env.LINE_CHANNEL_SECRET = mockChannelSecret;
        process.env.DISABLE_SIGNATURE_VALIDATION = 'false';
        
        // Create Express app with middleware
        app = express();
        app.use(express.json());
        app.use('/webhook/line', lineWebhook);
        
        // Mock sendLineReply to resolve successfully
        sendLineReply.mockResolvedValue({ success: true });
    });
    
    afterEach(() => {
        delete process.env.LINE_CHANNEL_SECRET;
        delete process.env.DISABLE_SIGNATURE_VALIDATION;
    });
    
    // Helper function to create valid signature
    const createSignature = (body) => {
        return crypto
            .createHmac('sha256', mockChannelSecret)
            .update(JSON.stringify(body))
            .digest('base64');
    };
    
    describe('Signature Validation', () => {
        test('should accept request with valid signature', async () => {
            const payload = {
                destination: 'test-destination',
                events: []
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(response.text).toBe('OK');
        });
        
        test('should reject request with invalid signature', async () => {
            const payload = {
                destination: 'test-destination',
                events: []
            };
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', 'invalid-signature')
                .send(payload);
                
            expect(response.status).toBe(401);
            expect(response.text).toBe('Unauthorized');
        });
        
        test('should reject request without signature header', async () => {
            const payload = {
                destination: 'test-destination',
                events: []
            };
            
            const response = await request(app)
                .post('/webhook/line')
                .send(payload);
                
            expect(response.status).toBe(401);
            expect(response.text).toBe('Unauthorized');
        });
        
        test('should return 500 when channel secret not configured', async () => {
            delete process.env.LINE_CHANNEL_SECRET;
            
            const payload = {
                destination: 'test-destination',
                events: []
            };
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', 'any-signature')
                .send(payload);
                
            expect(response.status).toBe(500);
            expect(response.text).toBe('Server configuration error');
        });
        
        test('should bypass signature validation when disabled', async () => {
            process.env.DISABLE_SIGNATURE_VALIDATION = 'true';
            
            const payload = {
                destination: 'test-destination',
                events: []
            };
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', 'invalid-signature')
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(response.text).toBe('OK');
        });
    });
    
    describe('Text Message Events', () => {
        test('should handle text message and send echo reply', async () => {
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
                        userId: 'user123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).toHaveBeenCalledWith('reply-token-123', 'Echo: Hello world');
        });
        
        test('should handle text message with mentions', async () => {
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'message',
                    message: {
                        type: 'text',
                        id: '12345',
                        text: '@bot hello',
                        mention: {
                            mentionees: [{
                                index: 0,
                                length: 4,
                                userId: 'bot123',
                                type: 'user',
                                isSelf: true
                            }]
                        }
                    },
                    source: {
                        userId: 'user123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).toHaveBeenCalledWith('reply-token-123', 'Echo: @bot hello');
        });
        
        test('should handle text message with quoted message', async () => {
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'message',
                    message: {
                        type: 'text',
                        id: '12345',
                        text: 'Replying to this',
                        quotedMessageId: 'quoted-msg-123'
                    },
                    source: {
                        userId: 'user123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).toHaveBeenCalledWith('reply-token-123', 'Echo: Replying to this');
        });
    });
    
    describe('Image Message Events', () => {
        test('should handle image message', async () => {
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
                        userId: 'user123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).toHaveBeenCalledWith('reply-token-123', 'I received your image! 📷');
        });
        
        test('should handle external image message', async () => {
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'message',
                    message: {
                        type: 'image',
                        id: 'img-123',
                        contentProvider: {
                            type: 'external',
                            originalContentUrl: 'https://example.com/image.jpg',
                            previewImageUrl: 'https://example.com/preview.jpg'
                        }
                    },
                    source: {
                        userId: 'user123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).toHaveBeenCalledWith('reply-token-123', 'I received your image! 📷');
        });
    });
    
    describe('Video Message Events', () => {
        test('should handle video message', async () => {
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'message',
                    message: {
                        type: 'video',
                        id: 'video-123',
                        duration: 30000,
                        contentProvider: {
                            type: 'line'
                        }
                    },
                    source: {
                        userId: 'user123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).toHaveBeenCalledWith('reply-token-123', 'I received your video! 🎥');
        });
    });
    
    describe('Audio Message Events', () => {
        test('should handle audio message', async () => {
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'message',
                    message: {
                        type: 'audio',
                        id: 'audio-123',
                        duration: 15000,
                        contentProvider: {
                            type: 'line'
                        }
                    },
                    source: {
                        userId: 'user123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).toHaveBeenCalledWith('reply-token-123', 'I received your voice message! 🎵');
        });
    });
    
    describe('File Message Events', () => {
        test('should handle file message', async () => {
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'message',
                    message: {
                        type: 'file',
                        id: 'file-123',
                        fileName: 'document.pdf',
                        fileSize: 1024000
                    },
                    source: {
                        userId: 'user123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).toHaveBeenCalledWith('reply-token-123', 'I received your file: document.pdf 📁');
        });
    });
    
    describe('Location Message Events', () => {
        test('should handle location message with title and address', async () => {
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'message',
                    message: {
                        type: 'location',
                        id: 'location-123',
                        title: 'LINE Tokyo Office',
                        address: 'Tokyo, Japan',
                        latitude: 35.6580339,
                        longitude: 139.7016358
                    },
                    source: {
                        userId: 'user123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).toHaveBeenCalledWith('reply-token-123', 'I received your location: LINE Tokyo Office 📍');
        });
        
        test('should handle location message with address only', async () => {
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'message',
                    message: {
                        type: 'location',
                        id: 'location-123',
                        address: 'Tokyo, Japan',
                        latitude: 35.6580339,
                        longitude: 139.7016358
                    },
                    source: {
                        userId: 'user123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).toHaveBeenCalledWith('reply-token-123', 'I received your location: Tokyo, Japan 📍');
        });
    });
    
    describe('Sticker Message Events', () => {
        test('should handle sticker message', async () => {
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'message',
                    message: {
                        type: 'sticker',
                        id: 'sticker-123',
                        packageId: '1',
                        stickerId: '1'
                    },
                    source: {
                        userId: 'user123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).toHaveBeenCalledWith('reply-token-123', 'Nice sticker! 😄');
        });
        
        test('should handle animated sticker message', async () => {
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'message',
                    message: {
                        type: 'sticker',
                        id: 'sticker-123',
                        packageId: '11537',
                        stickerId: '52002734',
                        stickerResourceType: 'ANIMATION',
                        keywords: ['happy', 'celebration']
                    },
                    source: {
                        userId: 'user123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).toHaveBeenCalledWith('reply-token-123', 'Nice sticker! 😄');
        });
    });
    
    describe('Follow Events', () => {
        test('should handle follow event', async () => {
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'follow',
                    source: {
                        userId: 'user123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).toHaveBeenCalledWith('reply-token-123', 'Thank you for adding me as a friend! 👋');
        });
    });
    
    describe('Unfollow Events', () => {
        test('should handle unfollow event (no reply)', async () => {
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'unfollow',
                    source: {
                        userId: 'user123'
                    }
                }]
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).not.toHaveBeenCalled();
        });
    });
    
    describe('Join Events', () => {
        test('should handle join group event', async () => {
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'join',
                    source: {
                        type: 'group',
                        groupId: 'group123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).toHaveBeenCalledWith('reply-token-123', 'Hello everyone! Thanks for adding me to the group! 🎉');
        });
    });
    
    describe('Leave Events', () => {
        test('should handle leave event (no reply)', async () => {
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'leave',
                    source: {
                        type: 'group',
                        groupId: 'group123'
                    }
                }]
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).not.toHaveBeenCalled();
        });
    });
    
    describe('Postback Events', () => {
        test('should handle postback event', async () => {
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'postback',
                    postback: {
                        data: 'action=buy&itemid=123'
                    },
                    source: {
                        userId: 'user123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).toHaveBeenCalledWith('reply-token-123', 'You clicked: action=buy&itemid=123');
        });
        
        test('should handle postback event with params', async () => {
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'postback',
                    postback: {
                        data: 'action=datetime',
                        params: {
                            datetime: '2023-12-25T10:00'
                        }
                    },
                    source: {
                        userId: 'user123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).toHaveBeenCalledWith('reply-token-123', 'You clicked: action=datetime');
        });
    });
    
    describe('Unsend Events', () => {
        test('should handle unsend event (no reply)', async () => {
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'unsend',
                    unsend: {
                        messageId: 'msg123'
                    },
                    source: {
                        userId: 'user123'
                    }
                }]
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).not.toHaveBeenCalled();
        });
    });
    
    describe('Unknown Message Types', () => {
        test('should handle unknown message type', async () => {
            const payload = {
                destination: 'test-destination',
                events: [{
                    type: 'message',
                    message: {
                        type: 'unknown-type',
                        id: 'unknown-123'
                    },
                    source: {
                        userId: 'user123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).toHaveBeenCalledWith('reply-token-123', 'I received your message, but I don\'t know how to handle this type yet.');
        });
    });
    
    describe('Error Handling', () => {
        test('should handle empty payload', async () => {
            const payload = {};
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).not.toHaveBeenCalled();
        });
        
        test('should handle payload with no events', async () => {
            const payload = {
                destination: 'test-destination'
            };
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).not.toHaveBeenCalled();
        });
        
        test('should handle sendLineReply failure gracefully', async () => {
            sendLineReply.mockRejectedValue(new Error('LINE API error'));
            
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
                        userId: 'user123'
                    },
                    replyToken: 'reply-token-123'
                }]
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(500);
            expect(response.text).toBe('Internal Server Error');
        });
        
        test('should handle multiple events in single request', async () => {
            const payload = {
                destination: 'test-destination',
                events: [
                    {
                        type: 'message',
                        message: {
                            type: 'text',
                            id: '12345',
                            text: 'First message'
                        },
                        source: {
                            userId: 'user123'
                        },
                        replyToken: 'reply-token-1'
                    },
                    {
                        type: 'message',
                        message: {
                            type: 'text',
                            id: '12346',
                            text: 'Second message'
                        },
                        source: {
                            userId: 'user123'
                        },
                        replyToken: 'reply-token-2'
                    }
                ]
            };
            
            const signature = createSignature(payload);
            
            const response = await request(app)
                .post('/webhook/line')
                .set('X-Line-Signature', signature)
                .send(payload);
                
            expect(response.status).toBe(200);
            expect(sendLineReply).toHaveBeenCalledTimes(2);
            expect(sendLineReply).toHaveBeenNthCalledWith(1, 'reply-token-1', 'Echo: First message');
            expect(sendLineReply).toHaveBeenNthCalledWith(2, 'reply-token-2', 'Echo: Second message');
        });
    });
});