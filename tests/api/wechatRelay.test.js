const axios = require('axios');
const wechatRelay = require('../../src/api/wechatRelay');

jest.mock('axios');
const mockedAxios = axios;

process.env.WECOM_CORP_ID = 'mock_corp_id_12345';
process.env.WECOM_CORP_SECRET = 'mock_secret_67890';
process.env.WECOM_AGENT_ID = '1000002';

describe('WeChat Work Relay - Official API Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Access Token Management', () => {
        test('should fetch access token successfully', async () => {
            const mockResponse = {
                data: {
                    errcode: 0,
                    errmsg: 'ok',
                    access_token: 'mock_token_123',
                    expires_in: 7200
                }
            };

            mockedAxios.get.mockResolvedValue(mockResponse);

            const token = await wechatRelay.getWeComAccessToken();
            expect(token).toBe('mock_token_123');

            expect(mockedAxios.get).toHaveBeenCalledWith(
                'https://qyapi.weixin.qq.com/cgi-bin/gettoken',
                expect.objectContaining({
                    params: {
                        corpid: 'mock_corp_id_12345',
                        corpsecret: 'mock_secret_67890'
                    },
                    timeout: 10000
                })
            );
        });

        test('should handle API error codes properly', async () => {
            jest.clearAllMocks();
            
            // Reset modules to clear token cache
            jest.resetModules();
            const freshWechatRelay = require('../../src/api/wechatRelay');
            const freshMockedAxios = require('axios');
            
            freshMockedAxios.get.mockResolvedValueOnce({ 
                data: { 
                    errcode: 40013, 
                    errmsg: 'invalid corpid' 
                } 
            });
            
            await expect(freshWechatRelay.getWeComAccessToken())
                .rejects
                .toThrow('WeChat Work API error: 40013 - invalid corpid');
        });

        test('should handle network errors', async () => {
            jest.clearAllMocks();
            
            // Reset modules to clear token cache
            jest.resetModules();
            const freshWechatRelay = require('../../src/api/wechatRelay');
            const freshMockedAxios = require('axios');
            
            const networkError = new Error('ECONNRESET');
            freshMockedAxios.get.mockRejectedValueOnce(networkError);

            await expect(freshWechatRelay.getWeComAccessToken())
                .rejects
                .toThrow('ECONNRESET');
        });

        test('should require corp ID and secret', async () => {
            const originalCorpId = process.env.WECOM_CORP_ID;
            const originalSecret = process.env.WECOM_CORP_SECRET;
            
            delete process.env.WECOM_CORP_ID;
            await expect(wechatRelay.getWeComAccessToken())
                .rejects
                .toThrow('WeChat Work credentials not configured');

            process.env.WECOM_CORP_ID = originalCorpId;
            delete process.env.WECOM_CORP_SECRET;
            await expect(wechatRelay.getWeComAccessToken())
                .rejects
                .toThrow('WeChat Work credentials not configured');

            process.env.WECOM_CORP_ID = originalCorpId;
            process.env.WECOM_CORP_SECRET = originalSecret;
        });

        test('should implement token caching', async () => {
            jest.clearAllMocks();
            
            // Clear the internal token cache by requiring fresh module
            jest.resetModules();
            const freshWechatRelay = require('../../src/api/wechatRelay');
            const freshMockedAxios = require('axios');
            
            const mockResponse = {
                data: {
                    errcode: 0,
                    errmsg: 'ok',
                    access_token: 'cached_token_test',
                    expires_in: 7200
                }
            };

            freshMockedAxios.get.mockResolvedValue(mockResponse);

            const token1 = await freshWechatRelay.getWeComAccessToken();
            expect(token1).toBe('cached_token_test');

            const token2 = await freshWechatRelay.getWeComAccessToken();
            expect(token2).toBe('cached_token_test');

            expect(freshMockedAxios.get).toHaveBeenCalledTimes(1);
        });
    });

    describe('Message Sending', () => {
        test('should send text message with correct format', async () => {
            jest.clearAllMocks();
            
            const mockTokenResponse = {
                data: {
                    errcode: 0,
                    errmsg: 'ok',  
                    access_token: 'message_test_token',
                    expires_in: 7200
                }
            };

            const mockSendResponse = {
                data: {
                    errcode: 0,
                    errmsg: 'ok',
                    invaliduser: 'none',
                    invalidparty: 'none',
                    invalidtag: 'none'
                }
            };

            mockedAxios.get.mockResolvedValue(mockTokenResponse);
            mockedAxios.post.mockResolvedValue(mockSendResponse);

            const result = await wechatRelay('Hello WeChat Work!');

            expect(result.errcode).toBe(0);
            expect(result.errmsg).toBe('ok');

            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.stringContaining('https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token='),
                expect.objectContaining({
                    toparty: '1',
                    msgtype: 'text',
                    agentid: 1000002,
                    text: {
                        content: 'Hello WeChat Work!'
                    }
                }),
                expect.objectContaining({
                    timeout: 10000
                })
            );
        });

        test('should handle message sending errors', async () => {
            jest.clearAllMocks();
            
            const mockTokenResponse = {
                data: {
                    errcode: 0,
                    errmsg: 'ok',
                    access_token: 'error_test_token',
                    expires_in: 7200
                }
            };

            const mockErrorResponse = {
                data: {
                    errcode: 40003,
                    errmsg: 'invalid userid'
                }
            };

            mockedAxios.get.mockResolvedValue(mockTokenResponse);
            mockedAxios.post.mockResolvedValue(mockErrorResponse);

            await expect(wechatRelay('Test message error'))
                .rejects
                .toThrow('WeChat Work send message error: 40003 - invalid userid');
        });

        test('should handle network errors during message sending', async () => {
            jest.clearAllMocks();
            
            const mockTokenResponse = {
                data: {
                    errcode: 0,
                    errmsg: 'ok',
                    access_token: 'network_error_token',
                    expires_in: 7200
                }
            };

            const networkError = new Error('ECONNRESET');

            mockedAxios.get.mockResolvedValue(mockTokenResponse);
            mockedAxios.post.mockRejectedValue(networkError);

            await expect(wechatRelay('Network error test'))
                .rejects
                .toThrow('ECONNRESET');
        });

        test('should validate message content', async () => {
            // Test empty message
            await expect(wechatRelay(''))
                .rejects
                .toThrow('Message content cannot be empty');

            // Test null message  
            await expect(wechatRelay(null))
                .rejects
                .toThrow('Message content cannot be empty');

            // Test undefined message
            await expect(wechatRelay(undefined))
                .rejects
                .toThrow('Message content cannot be empty');
        });

        test('should require agent ID', async () => {
            const originalAgentId = process.env.WECOM_AGENT_ID;
            delete process.env.WECOM_AGENT_ID;

            await expect(wechatRelay('Test message'))
                .rejects
                .toThrow('WeChat Work agent ID not configured');

            process.env.WECOM_AGENT_ID = originalAgentId;
        });
    });
});
