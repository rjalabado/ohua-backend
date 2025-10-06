const axios = require('axios');

/**
 * Translation service for handling language translation between Japanese and Chinese
 * Supports multiple translation providers
 */

class TranslationService {
    constructor() {
        this.openaiApiKey = process.env.OPENAI_API_KEY;
        this.openaiModel = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
        this.timeout = parseInt(process.env.REQUEST_TIMEOUT) || 10000;
        
        // Environment validation
        this.validateEnvironment();
    }

    /**
     * Validate required environment variables
     */
    validateEnvironment() {
        const requiredVars = ['OPENAI_API_KEY'];
        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
            console.warn('🔄 Translation will fall back to original text.');
        } else {
            console.log('✅ Translation service initialized successfully');
        }
    }

    /**
     * Translate text from any language to Chinese (Simplified)
     * @param {string} text - Text to translate
     * @param {string} sourceLang - Source language (optional, auto-detect if not provided)
     * @returns {Promise<string>} - Translated text in Chinese
     */
    async translateToChinese(text, sourceLang = 'auto') {
        if (!text || typeof text !== 'string') {
            console.warn('Invalid text provided for translation to Chinese');
            return text || '';
        }

        try {
            console.log(`Translating to Chinese: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
            
            const translatedText = await this._performTranslation(text, sourceLang, 'zh-CN');
            console.log(`Chinese translation: "${translatedText.substring(0, 100)}${translatedText.length > 100 ? '...' : ''}"`);
            
            return translatedText;
        } catch (error) {
            console.error('Error translating to Chinese:', error.message);
            return text; // Return original text if translation fails
        }
    }

    /**
     * Translate text from any language to Japanese
     * @param {string} text - Text to translate
     * @param {string} sourceLang - Source language (optional, auto-detect if not provided)
     * @returns {Promise<string>} - Translated text in Japanese
     */
    async translateToJapanese(text, sourceLang = 'auto') {
        if (!text || typeof text !== 'string') {
            console.warn('Invalid text provided for translation to Japanese');
            return text || '';
        }

        try {
            console.log(`Translating to Japanese: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
            
            const translatedText = await this._performTranslation(text, sourceLang, 'ja');
            console.log(`Japanese translation: "${translatedText.substring(0, 100)}${translatedText.length > 100 ? '...' : ''}"`);
            
            return translatedText;
        } catch (error) {
            console.error('Error translating to Japanese:', error.message);
            return text; // Return original text if translation fails
        }
    }

    /**
     * Detect the language of the given text
     * @param {string} text - Text to analyze
     * @returns {Promise<string>} - Language code
     */
    async detectLanguage(text) {
        if (!text || typeof text !== 'string') {
            return 'unknown';
        }

        try {
            // Simple heuristic detection - check Japanese first for mixed CJK
            if (this._containsJapanese(text)) {
                return 'ja';
            } else if (this._containsChinese(text)) {
                return 'zh';
            } else if (this._containsKorean(text)) {
                return 'ko';
            } else {
                return 'en'; // Default to English for other languages
            }
        } catch (error) {
            console.error('Error detecting language:', error.message);
            return 'unknown';
        }
    }

    /**
     * Perform the actual translation using OpenAI or mock for testing
     * @private
     */
    async _performTranslation(text, sourceLang, targetLang) {
        // If source and target are the same, return original text
        if (sourceLang === targetLang) {
            console.log('Source and target languages are the same, skipping translation');
            return text;
        }

        // Use mock for testing, OpenAI for production
        if (process.env.NODE_ENV === 'test' || process.env.TRANSLATION_PROVIDER === 'mock') {
            return await this._translateWithMock(text, sourceLang, targetLang);
        }
        
        return await this._translateWithOpenAI(text, targetLang);
    }

    /**
     * OpenAI translation implementation
     * @private
     */
    async _translateWithOpenAI(text, targetLang) {
        if (!this.openaiApiKey) {
            console.warn('OpenAI API key not configured, returning original text');
            return text;
        }

        try {
            const targetLanguage = targetLang === 'zh-CN' || targetLang === 'zh' ? 'Chinese (Simplified)' : 'Japanese';
            
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a professional translator. Translate the following text to ${targetLanguage}. Only return the translated text, no explanations or additional content.`
                        },
                        {
                            role: 'user',
                            content: text
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.3
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.openaiApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: this.timeout
                }
            );

            return response.data.choices[0].message.content.trim();
        } catch (error) {
            console.error('OpenAI translation error:', error.response?.data || error.message);
            return text; // Fallback to original text
        }
    }

    /**
     * Mock translation for testing
     * @private
     */
    async _translateWithMock(text, sourceLang, targetLang) {
        console.log(`Mock translation: ${sourceLang} -> ${targetLang}: ${text}`);
        
        // Simple mock responses for testing
        if (targetLang === 'zh-CN' || targetLang === 'zh') {
            return `[中文] ${text}`;
        } else if (targetLang === 'ja') {
            return `[日本語] ${text}`;
        }
        
        return `[${targetLang}] ${text}`;
    }

    /**
     * Check if text contains Chinese characters
     * @private
     */
    _containsChinese(text) {
        // Chinese characters but exclude Japanese kanji context
        const hasChinese = /[\u4e00-\u9fff]/.test(text);
        const hasJapaneseContext = /[\u3040-\u309f\u30a0-\u30ff]/.test(text);
        return hasChinese && !hasJapaneseContext;
    }

    /**
     * Check if text contains Japanese characters
     * @private
     */
    _containsJapanese(text) {
        return /[\u3040-\u309f\u30a0-\u30ff\u31f0-\u31ff]/.test(text);
    }

    /**
     * Check if text contains Korean characters
     * @private
     */
    _containsKorean(text) {
        return /[\uac00-\ud7af]/.test(text);
    }
}

// Singleton instance
const translationService = new TranslationService();

module.exports = {
    TranslationService,
    translationService
};