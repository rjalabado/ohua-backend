const OpenAI = require('openai');

// Cost optimization constants
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo-0125'; // Default to cheapest model
const DEFAULT_MAX_TOKENS = 150; // Conservative token limit

// Initialize OpenAI client (only if API key is available)
let openai = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
}

// Translate text using OpenAI
async function translateText(text, targetLanguage = 'English', sourceLanguage = 'auto-detect') {
    // Validate inputs
    if (!text || typeof text !== 'string') {
        console.error('Invalid text provided for translation');
        return null;
    }

    if (!process.env.OPENAI_API_KEY || !openai) {
        console.error('OPENAI_API_KEY not configured');
        return null;
    }

    try {
        console.log(`Translating: "${text}" to ${targetLanguage}`);

        const prompt = sourceLanguage === 'auto-detect' 
            ? `Translate the following text to ${targetLanguage}. Only return the translated text, nothing else:\n\n${text}`
            : `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Only return the translated text, nothing else:\n\n${text}`;

        const response = await openai.chat.completions.create({
            model: OPENAI_MODEL, // Model from environment variable
            messages: [
                {
                    role: 'system',
                    content: 'Translate accurately. Return only the translated text.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: Math.min(text.length * 3, 150), // Dynamic token limit based on input
            temperature: 0.1 // Very low for consistency and cost
        });

        const translatedText = response.choices[0]?.message?.content?.trim();
        
        if (!translatedText) {
            console.error('No translation received from OpenAI');
            return null;
        }

        console.log(`Translation successful: "${translatedText}"`);
        return translatedText;

    } catch (error) {
        console.error('Error translating text:', error.message);
        
        // Handle specific OpenAI errors
        if (error.status === 401) {
            console.error('OpenAI API key is invalid');
        } else if (error.status === 429) {
            console.error('OpenAI API rate limit exceeded');
        } else if (error.status === 500) {
            console.error('OpenAI API server error');
        }
        
        return null;
    }
}

// Language detection helper (optional)
async function detectLanguage(text) {
    if (!text || typeof text !== 'string') {
        return null;
    }

    try {
        const response = await openai.chat.completions.create({
            model: OPENAI_MODEL, // Model from environment variable
            messages: [
                {
                    role: 'system',
                    content: 'Detect language. Return only the language name.'
                },
                {
                    role: 'user',
                    content: `Language: "${text}"`
                }
            ],
            max_tokens: 10, // Very small for just language name
            temperature: 0
        });

        const detectedLanguage = response.choices[0]?.message?.content?.trim();
        console.log(`Detected language: ${detectedLanguage}`);
        return detectedLanguage;

    } catch (error) {
        console.error('Error detecting language:', error.message);
        return null;
    }
}

// Estimate cost for translation (approximate)
function estimateTranslationCost(text, includeDetection = false) {
    const inputTokens = Math.ceil(text.length / 4); // Rough estimate: 4 chars = 1 token
    const outputTokens = Math.ceil(inputTokens * 1.2); // Translations usually slightly longer
    
    // GPT-3.5-turbo-0125 pricing (as of 2024)
    const inputCostPer1K = 0.0005; // $0.0005 per 1K input tokens
    const outputCostPer1K = 0.0015; // $0.0015 per 1K output tokens
    
    let cost = (inputTokens / 1000) * inputCostPer1K + (outputTokens / 1000) * outputCostPer1K;
    
    if (includeDetection) {
        cost += 0.00002; // Small additional cost for language detection
    }
    
    return {
        estimatedInputTokens: inputTokens,
        estimatedOutputTokens: outputTokens,
        estimatedCostUSD: parseFloat(cost.toFixed(6))
    };
}

module.exports = {
    translateText,
    detectLanguage,
    estimateTranslationCost,
    // Backward compatibility alias
    translate: translateText
};