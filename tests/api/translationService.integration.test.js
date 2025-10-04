// Integration tests for translation service with real OpenAI API
require('dotenv').config();
const { translateText, detectLanguage } = require('../../src/api/translationService');

describe('Translation Service - Real API Integration', () => {
    // Test with real OpenAI API
    test('should translate text with real OpenAI API', async () => {
        const result = await translateText('Hello World', 'Spanish');
        
        console.log('Translation result:', result);
        
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
        expect(result.toLowerCase()).toContain('hola');
    }, 15000); // 15 second timeout for API call

    test('should translate longer text', async () => {
        const longText = 'Good morning! How are you doing today? I hope you are having a wonderful day.';
        const result = await translateText(longText, 'French');
        
        console.log('Long text translation:', result);
        
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(10);
    }, 15000);

    test('should detect language with real OpenAI API', async () => {
        const result = await detectLanguage('Hola mundo');
        
        console.log('Detected language:', result);
        
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
        expect(result.toLowerCase()).toMatch(/spanish|español/);
    }, 15000);

    test('should handle Chinese text', async () => {
        const result = await translateText('你好世界', 'English');
        
        console.log('Chinese translation:', result);
        
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
        expect(result.toLowerCase()).toContain('hello');
    }, 15000);

    test('should translate with source language specified', async () => {
        const result = await translateText('Bonjour le monde', 'English', 'French');
        
        console.log('French to English:', result);
        
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
        expect(result.toLowerCase()).toContain('hello');
    }, 15000);
});