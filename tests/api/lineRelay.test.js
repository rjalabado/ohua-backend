const axios = require('axios');
const {
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
} = require('../../src/api/lineRelay');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('LINE Relay', () => {
    const mockAccessToken = 'test-access-token';
    
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.LINE_CHANNEL_ACCESS_TOKEN = mockAccessToken;
        
        // Default successful response
        mockedAxios.post.mockResolvedValue({
            data: { success: true }
        });
        
        mockedAxios.get.mockResolvedValue({
            data: { success: true }
        });
    });
    
    afterEach(() => {
        delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    });

    describe('sendLineReply', () => {
        test('should send text reply message successfully', async () => {
            const replyToken = 'reply-token-123';
            const message = 'Hello world';
            
            const result = await sendLineReply(replyToken, message);
            
            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://api.line.me/v2/bot/message/reply',
                {
                    replyToken,
                    messages: [{ type: 'text', text: message }]
                },
                {
                    headers: {
                        'Authorization': `Bearer ${mockAccessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );
            
            expect(result).toEqual({ success: true });
        });
        
        test('should send message object reply successfully', async () => {
            const replyToken = 'reply-token-123';
            const message = { type: 'text', text: 'Hello world' };
            
            const result = await sendLineReply(replyToken, message);
            
            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://api.line.me/v2/bot/message/reply',
                {
                    replyToken,
                    messages: [message]
                },
                expect.any(Object)
            );
            
            expect(result).toEqual({ success: true });
        });
        
        test('should send array of messages successfully', async () => {
            const replyToken = 'reply-token-123';
            const messages = [
                { type: 'text', text: 'First message' },
                { type: 'text', text: 'Second message' }
            ];
            
            const result = await sendLineReply(replyToken, messages);
            
            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://api.line.me/v2/bot/message/reply',
                {
                    replyToken,
                    messages
                },
                expect.any(Object)
            );
            
            expect(result).toEqual({ success: true });
        });
        
        test('should return null when reply token is missing', async () => {
            const result = await sendLineReply(null, 'Hello world');
            
            expect(mockedAxios.post).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });
        
        test('should return null when message is missing', async () => {
            const result = await sendLineReply('reply-token-123', null);
            
            expect(mockedAxios.post).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });
        
        test('should return null when access token is not configured', async () => {
            delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
            
            const result = await sendLineReply('reply-token-123', 'Hello world');
            
            expect(mockedAxios.post).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });
        
        test('should handle API errors gracefully', async () => {
            const errorResponse = {
                response: {
                    data: { message: 'Invalid reply token' }
                }
            };
            mockedAxios.post.mockRejectedValue(errorResponse);
            
            const result = await sendLineReply('invalid-token', 'Hello world');
            
            expect(result).toBeNull();
        });
        
        test('should handle network errors gracefully', async () => {
            const networkError = new Error('Network error');
            mockedAxios.post.mockRejectedValue(networkError);
            
            const result = await sendLineReply('reply-token-123', 'Hello world');
            
            expect(result).toBeNull();
        });
    });

    describe('sendLinePush', () => {
        test('should send push message successfully', async () => {
            const to = 'user123';
            const message = 'Push notification';
            
            const result = await sendLinePush(to, message);
            
            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://api.line.me/v2/bot/message/push',
                {
                    to,
                    messages: [{ type: 'text', text: message }]
                },
                {
                    headers: {
                        'Authorization': `Bearer ${mockAccessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );
            
            expect(result).toEqual({ success: true });
        });
        
        test('should return null when recipient is missing', async () => {
            const result = await sendLinePush(null, 'Hello world');
            
            expect(mockedAxios.post).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });
        
        test('should handle API errors gracefully', async () => {
            const errorResponse = {
                response: {
                    data: { message: 'Invalid user ID' }
                }
            };
            mockedAxios.post.mockRejectedValue(errorResponse);
            
            const result = await sendLinePush('invalid-user', 'Hello world');
            
            expect(result).toBeNull();
        });
    });

    describe('sendLineMulticast', () => {
        test('should send multicast message successfully', async () => {
            const to = ['user123', 'user456', 'user789'];
            const message = 'Broadcast message';
            
            const result = await sendLineMulticast(to, message);
            
            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://api.line.me/v2/bot/message/multicast',
                {
                    to,
                    messages: [{ type: 'text', text: message }]
                },
                {
                    headers: {
                        'Authorization': `Bearer ${mockAccessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );
            
            expect(result).toEqual({ success: true });
        });
        
        test('should return null when recipients array is empty', async () => {
            const result = await sendLineMulticast([], 'Hello world');
            
            expect(mockedAxios.post).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });
        
        test('should return null when recipients is not an array', async () => {
            const result = await sendLineMulticast('user123', 'Hello world');
            
            expect(mockedAxios.post).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });
        
        test('should handle API errors gracefully', async () => {
            const errorResponse = {
                response: {
                    data: { message: 'Some user IDs are invalid' }
                }
            };
            mockedAxios.post.mockRejectedValue(errorResponse);
            
            const result = await sendLineMulticast(['user123'], 'Hello world');
            
            expect(result).toBeNull();
        });
    });

    describe('getLineUserProfile', () => {
        test('should get user profile successfully', async () => {
            const userId = 'user123';
            const mockProfile = {
                displayName: 'John Doe',
                userId: 'user123',
                pictureUrl: 'https://example.com/profile.jpg',
                statusMessage: 'Hello world!'
            };
            
            mockedAxios.get.mockResolvedValue({ data: mockProfile });
            
            const result = await getLineUserProfile(userId);
            
            expect(mockedAxios.get).toHaveBeenCalledWith(
                `https://api.line.me/v2/bot/profile/${userId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${mockAccessToken}`
                    },
                    timeout: 10000
                }
            );
            
            expect(result).toEqual(mockProfile);
        });
        
        test('should return null when user ID is missing', async () => {
            const result = await getLineUserProfile(null);
            
            expect(mockedAxios.get).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });
        
        test('should handle API errors gracefully', async () => {
            const errorResponse = {
                response: {
                    data: { message: 'User not found' }
                }
            };
            mockedAxios.get.mockRejectedValue(errorResponse);
            
            const result = await getLineUserProfile('invalid-user');
            
            expect(result).toBeNull();
        });
    });

    describe('getLineMessageContent', () => {
        test('should get message content successfully', async () => {
            const messageId = 'msg123';
            const mockStream = { pipe: jest.fn() };
            
            mockedAxios.get.mockResolvedValue({ data: mockStream });
            
            const result = await getLineMessageContent(messageId);
            
            expect(mockedAxios.get).toHaveBeenCalledWith(
                `https://api-data.line.me/v2/bot/message/${messageId}/content`,
                {
                    headers: {
                        'Authorization': `Bearer ${mockAccessToken}`
                    },
                    responseType: 'stream',
                    timeout: 30000
                }
            );
            
            expect(result).toEqual(mockStream);
        });
        
        test('should return null when message ID is missing', async () => {
            const result = await getLineMessageContent(null);
            
            expect(mockedAxios.get).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });
        
        test('should handle API errors gracefully', async () => {
            const errorResponse = {
                response: {
                    data: { message: 'Content not found or expired' }
                }
            };
            mockedAxios.get.mockRejectedValue(errorResponse);
            
            const result = await getLineMessageContent('invalid-msg');
            
            expect(result).toBeNull();
        });
    });

    describe('Message Helper Functions', () => {
        test('createTextMessage should create text message object', () => {
            const text = 'Hello world';
            const result = createTextMessage(text);
            
            expect(result).toEqual({
                type: 'text',
                text
            });
        });
        
        test('createStickerMessage should create sticker message object', () => {
            const packageId = 1;
            const stickerId = 2;
            const result = createStickerMessage(packageId, stickerId);
            
            expect(result).toEqual({
                type: 'sticker',
                packageId: '1',
                stickerId: '2'
            });
        });
        
        test('createImageMessage should create image message object', () => {
            const originalContentUrl = 'https://example.com/image.jpg';
            const previewImageUrl = 'https://example.com/preview.jpg';
            const result = createImageMessage(originalContentUrl, previewImageUrl);
            
            expect(result).toEqual({
                type: 'image',
                originalContentUrl,
                previewImageUrl
            });
        });
        
        test('createVideoMessage should create video message object', () => {
            const originalContentUrl = 'https://example.com/video.mp4';
            const previewImageUrl = 'https://example.com/thumbnail.jpg';
            const result = createVideoMessage(originalContentUrl, previewImageUrl);
            
            expect(result).toEqual({
                type: 'video',
                originalContentUrl,
                previewImageUrl
            });
        });
        
        test('createAudioMessage should create audio message object', () => {
            const originalContentUrl = 'https://example.com/audio.mp3';
            const duration = 30000;
            const result = createAudioMessage(originalContentUrl, duration);
            
            expect(result).toEqual({
                type: 'audio',
                originalContentUrl,
                duration
            });
        });
        
        test('createLocationMessage should create location message object', () => {
            const title = 'LINE Tokyo Office';
            const address = 'Tokyo, Japan';
            const latitude = 35.6580339;
            const longitude = 139.7016358;
            const result = createLocationMessage(title, address, latitude, longitude);
            
            expect(result).toEqual({
                type: 'location',
                title,
                address,
                latitude,
                longitude
            });
        });
    });

    describe('Integration Tests', () => {
        test('should send complex message with multiple types', async () => {
            const replyToken = 'reply-token-123';
            const messages = [
                createTextMessage('Here are some examples:'),
                createImageMessage(
                    'https://example.com/image.jpg',
                    'https://example.com/preview.jpg'
                ),
                createStickerMessage(1, 1),
                createLocationMessage(
                    'Meeting Point',
                    'Tokyo Station',
                    35.6812,
                    139.7671
                )
            ];
            
            const result = await sendLineReply(replyToken, messages);
            
            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://api.line.me/v2/bot/message/reply',
                {
                    replyToken,
                    messages
                },
                expect.any(Object)
            );
            
            expect(result).toEqual({ success: true });
        });
        
        test('should handle timeout configuration correctly', async () => {
            await sendLineReply('token', 'message');
            
            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(Object),
                expect.objectContaining({
                    timeout: 10000
                })
            );
        });
        
        test('should handle content download timeout correctly', async () => {
            await getLineMessageContent('msg123');
            
            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    timeout: 30000
                })
            );
        });
    });

    describe('Error Scenarios', () => {
        test('should handle missing access token in all functions', async () => {
            delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
            
            const replyResult = await sendLineReply('token', 'message');
            const pushResult = await sendLinePush('user', 'message');
            const multicastResult = await sendLineMulticast(['user'], 'message');
            const profileResult = await getLineUserProfile('user');
            const contentResult = await getLineMessageContent('msg');
            
            expect(replyResult).toBeNull();
            expect(pushResult).toBeNull();
            expect(multicastResult).toBeNull();
            expect(profileResult).toBeNull();
            expect(contentResult).toBeNull();
            
            expect(mockedAxios.post).not.toHaveBeenCalled();
            expect(mockedAxios.get).not.toHaveBeenCalled();
        });
        
        test('should handle rate limiting errors', async () => {
            const rateLimitError = {
                response: {
                    status: 429,
                    data: { message: 'Rate limit exceeded' }
                }
            };
            mockedAxios.post.mockRejectedValue(rateLimitError);
            
            const result = await sendLineReply('token', 'message');
            
            expect(result).toBeNull();
        });
        
        test('should handle authentication errors', async () => {
            const authError = {
                response: {
                    status: 401,
                    data: { message: 'Invalid access token' }
                }
            };
            mockedAxios.post.mockRejectedValue(authError);
            
            const result = await sendLinePush('user', 'message');
            
            expect(result).toBeNull();
        });
        
        test('should handle server errors', async () => {
            const serverError = {
                response: {
                    status: 500,
                    data: { message: 'Internal server error' }
                }
            };
            mockedAxios.get.mockRejectedValue(serverError);
            
            const result = await getLineUserProfile('user');
            
            expect(result).toBeNull();
        });
    });
});