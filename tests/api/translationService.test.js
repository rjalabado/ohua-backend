// Load environment variables for testing
require('dotenv').config();

// Mock OpenAI before importing the service
const mockCreate = jest.fn();
jest.mock('openai', () => {
    return jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: mockCreate
            }
        }
    }));
});

const { translateText, detectLanguage } = require('../../src/api/translationService');

describe('Translation Service', () => {
    beforeEach(() => {
        // Reset environment variables
        process.env.OPENAI_API_KEY = 'test-api-key';
        
        // Reset all mocks
        mockCreate.mockClear();
    });

    describe('translateText', () => {
        test('should translate text successfully', async () => {
            // Mock successful OpenAI response
            mockCreate.mockResolvedValue({
                choices: [{
                    message: {
                        content: '你好世界'
                    }
                }]
            });

            const result = await translateText('Hello World', 'Chinese');

            expect(result).toBe('你好世界');
            expect(mockCreate).toHaveBeenCalledWith({
                model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo-0125',
                messages: [
                    {
                        role: 'system',
                        content: 'Translate accurately. Return only the translated text.'
                    },
                    {
                        role: 'user',
                        content: 'Translate the following text to Chinese. Only return the translated text, nothing else:\n\nHello World'
                    }
                ],
                max_tokens: 33, // Math.min('Hello World'.length * 3, 150)
                temperature: 0.1
            });
        });

        test('should handle invalid text input', async () => {
            const result1 = await translateText('', 'Chinese');
            const result2 = await translateText(null, 'Chinese');
            const result3 = await translateText(123, 'Chinese');

            expect(result1).toBeNull();
            expect(result2).toBeNull();
            expect(result3).toBeNull();
            expect(mockCreate).not.toHaveBeenCalled();
        });

        test('should handle missing OpenAI API key', async () => {
            delete process.env.OPENAI_API_KEY;

            const result = await translateText('Hello World', 'Chinese');

            expect(result).toBeNull();
            expect(mockCreate).not.toHaveBeenCalled();
        });

        test('should handle OpenAI API errors', async () => {
            mockCreate.mockRejectedValue({
                status: 401,
                message: 'Invalid API key'
            });

            const result = await translateText('Hello World', 'Chinese');

            expect(result).toBeNull();
        });

        test('should handle empty response from OpenAI', async () => {
            mockCreate.mockResolvedValue({
                choices: [{
                    message: {
                        content: ''
                    }
                }]
            });

            const result = await translateText('Hello World', 'Chinese');

            expect(result).toBeNull();
        });

        test('should handle source language specification', async () => {
            mockCreate.mockResolvedValue({
                choices: [{
                    message: {
                        content: 'Hello World'
                    }
                }]
            });

            await translateText('你好世界', 'English', 'Chinese');

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: expect.arrayContaining([
                        expect.objectContaining({
                            role: 'user',
                            content: 'Translate the following text from Chinese to English. Only return the translated text, nothing else:\n\n你好世界'
                        })
                    ])
                })
            );
        });
    });

    describe('detectLanguage', () => {
        test('should detect language successfully', async () => {
            mockCreate.mockResolvedValue({
                choices: [{
                    message: {
                        content: 'Chinese'
                    }
                }]
            });

            const result = await detectLanguage('你好世界');

            expect(result).toBe('Chinese');
            expect(mockCreate).toHaveBeenCalledWith({
                model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo-0125',
                messages: [
                    {
                        role: 'system',
                        content: 'Detect language. Return only the language name.'
                    },
                    {
                        role: 'user',
                        content: 'Language: "你好世界"'
                    }
                ],
                max_tokens: 10,
                temperature: 0
            });
        });

        test('should handle invalid input for language detection', async () => {
            const result1 = await detectLanguage('');
            const result2 = await detectLanguage(null);
            const result3 = await detectLanguage(123);

            expect(result1).toBeNull();
            expect(result2).toBeNull();
            expect(result3).toBeNull();
            expect(mockCreate).not.toHaveBeenCalled();
        });

        test('should handle API errors in language detection', async () => {
            mockCreate.mockRejectedValue({
                status: 429,
                message: 'Rate limit exceeded'
            });

            const result = await detectLanguage('Hello World');

            expect(result).toBeNull();
        });
    });
});

// Integration test (requires real API key - disabled by default)
describe('Translation Service Integration Tests', () => {
    // Real OpenAI API test - disabled to avoid rate limits in unit tests
    test.skip('should translate with real OpenAI API', async () => {
        // This test requires a real OPENAI_API_KEY in .env
        const result = await translateText('Hello World', 'Spanish');
        
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
        expect(result.toLowerCase()).toContain('hola');
        console.log('Translation result:', result);
    }, 10000); // 10 second timeout for API call

    test.skip('should detect language with real OpenAI API', async () => {
        // This test requires a real OPENAI_API_KEY in .env
        const result = await detectLanguage('Hola mundo');
        
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
        console.log('Detected language:', result);
    });
});