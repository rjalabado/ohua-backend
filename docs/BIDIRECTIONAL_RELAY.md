# Bidirectional LINE-WeChat Translation Relay System

## Overview

This system provides automatic bidirectional message relay between LINE and WeChat Work platforms with real-time translation:

- **LINE → WeChat**: Messages from LINE are translated to **Chinese (Simplified)** and forwarded to WeChat
- **WeChat → LINE**: Messages from WeChat are translated to **Japanese** and forwarded to LINE

## Features

### 🔄 **Bidirectional Message Relay**
- Automatic translation and forwarding between platforms
- Support for text messages, images, stickers, and other media types
- User mapping system to connect LINE and WeChat users
- Real-time processing with error handling

### 🌐 **OpenAI-Powered Translation**
- **OpenAI GPT-3.5-turbo** - High-quality, context-aware translation
- **Japanese ↔ Chinese** - Optimized for your specific language pair
- **Mock Provider** - For development and testing

### 👥 **User Management**
- Flexible user mapping system
- Auto-mapping based on profile similarity
- Group chat support
- Profile caching for better mapping accuracy

### 🛡️ **Security & Reliability**
- Webhook signature verification for both platforms
- Comprehensive error handling and fallback mechanisms
- Configurable timeouts and retry logic
- Extensive logging for debugging

## System Architecture

```
LINE Platform ←→ LINE Webhook ←→ Translation Service ←→ WeChat Relay ←→ WeChat Work
                      ↓                    ↑                    ↓
                 User Mapping ←→ Translation ←→ User Mapping
                      ↓                    ↑                    ↓
WeChat Work ←→ WeChat Webhook ←→ Translation Service ←→ LINE Relay ←→ LINE Platform
```

## Setup Instructions

### 1. Environment Configuration

Copy the `.env.relay` file and configure your environment:

```bash
# Copy configuration template
cp .env.relay .env

# Edit configuration
nano .env
```

### 2. Translation Service Setup

Configure your OpenAI API key for translation:

#### Production (OpenAI)
```env
OPENAI_API_KEY=your_openai_api_key_here
# TRANSLATION_PROVIDER is not needed - OpenAI is used by default
```

#### Development/Testing (Mock)
```env
TRANSLATION_PROVIDER=mock
# OPENAI_API_KEY not needed for testing
```

### 3. User Mapping Configuration

Configure user mappings in the `USER_MAPPINGS` environment variable:

```json
{
  "users": [
    {
      "lineUserId": "line_user_123",
      "wechatUserId": "wechat_user_456", 
      "displayName": "John Doe"
    }
  ],
  "groups": [
    {
      "lineGroupId": "line_group_123",
      "wechatGroupId": "wechat_group_456",
      "displayName": "Team Chat"
    }
  ]
}
```

### 4. Platform Webhooks

Ensure your LINE and WeChat Work webhooks are properly configured:

- **LINE Webhook URL**: `https://your-domain.com/webhook/line`
- **WeChat Webhook URL**: `https://your-domain.com/webhook/wechat`

## Usage Examples

### Sending a Message from LINE to WeChat

1. User sends message in LINE: `"こんにちは、元気ですか？"` (Japanese)
2. System processes the message:
   - Detects LINE user ID
   - Finds mapped WeChat user
   - Translates to Chinese: `"你好，你好吗？"`
   - Sends to WeChat user
3. LINE user receives confirmation: `"✅ メッセージをWeChatに転送しました"`

### Sending a Message from WeChat to LINE

1. User sends message in WeChat Work: `"你好，这是测试消息"` (Chinese)
2. System processes the message:
   - Detects WeChat user ID
   - Finds mapped LINE user
   - Translates to Japanese: `"こんにちは、これはテストメッセージです"`
   - Sends to LINE user via push message

### Media Message Handling

- **Images**: Converts to text notification (`"📷 画像が送信されました"`)
- **Stickers**: Converts to emoji with keywords (`"😄 happy smile"`)
- **Voice/Audio**: Converts to notification (`"🎵 音声メッセージ"`)
- **Files**: Shows filename and type (`"📁 document.pdf"`)

## API Reference

### Translation Service

```javascript
const { translationService } = require('./src/services/translationService');

// Translate to Chinese (for LINE → WeChat)
const chinese = await translationService.translateToChinese('Hello world');

// Translate to Japanese (for WeChat → LINE)  
const japanese = await translationService.translateToJapanese('你好世界');

// Detect language
const lang = await translationService.detectLanguage('こんにちは');
```

### User Mapping Service

```javascript
const { userMappingService } = require('./src/services/userMappingService');

// Create user mapping
userMappingService.mapLineToWeChat('line_user_123', 'wechat_user_456');

// Get mapped users
const wechatUser = userMappingService.getWeChatUserFromLine('line_user_123');
const lineUser = userMappingService.getLineUserFromWeChat('wechat_user_456');

// Store user profiles for better matching
userMappingService.storeUserProfile('line', 'user123', {
    displayName: 'John Doe',
    pictureUrl: 'https://...'
});
```

## Configuration Options

### Feature Toggles
```env
ENABLE_LINE_TO_WECHAT_RELAY=true
ENABLE_WECHAT_TO_LINE_RELAY=true
ENABLE_AUTO_USER_MAPPING=false
ENABLE_GROUP_RELAY=false
ENABLE_MEDIA_RELAY_NOTIFICATIONS=true
```

### Performance Settings
```env
MAX_MESSAGE_LENGTH=1000
TRANSLATION_TIMEOUT=10000
LOG_TRANSLATIONS=true
LOG_RELAY_ATTEMPTS=true
```

### Development Settings
```env
NODE_ENV=development
CREATE_TEST_MAPPINGS=true
WECOM_MOCK_MESSAGES=true
```

## Testing

Run the comprehensive test suite:

```bash
# Test all components
npm test

# Test just the relay integration
npm test -- --testPathPatterns="tests/api/relayIntegration"

# Test LINE webhook and relay
npm test -- --testPathPatterns="tests/api/line"

# Test WeChat webhook and relay  
npm test -- --testPathPatterns="tests/api/weChat"
```

## Monitoring and Logging

The system provides extensive logging for monitoring:

```
[INFO] Received text message from LINE user: line_user_123
[INFO] Translating to Chinese: "こんにちは、元気ですか？"
[INFO] Chinese translation: "你好，你好吗？" 
[INFO] Message relayed from LINE to WeChat: line_user_123 -> wechat_user_456
[SUCCESS] ✅ Message successfully relayed from LINE to WeChat
```

## Error Handling

The system handles various error scenarios gracefully:

- **Translation failures**: Falls back to original text
- **Network errors**: Retries with exponential backoff
- **Missing mappings**: Logs warning and sends echo reply
- **API rate limits**: Implements proper retry logic
- **Malformed messages**: Validates and sanitizes input

## Production Deployment

### Security Considerations

1. **Enable signature validation**: Set `DISABLE_SIGNATURE_VALIDATION=false`
2. **Use HTTPS**: Ensure all webhook URLs use HTTPS
3. **Secure API keys**: Use environment variables, not hardcoded keys
4. **Rate limiting**: Implement rate limiting for webhook endpoints
5. **Input validation**: All user input is validated and sanitized

### Scaling Considerations

1. **Database storage**: Replace in-memory user mappings with persistent database
2. **Message queues**: Use Redis or RabbitMQ for high-volume processing  
3. **Load balancing**: Deploy multiple instances behind a load balancer
4. **Caching**: Implement translation caching to reduce API calls
5. **Monitoring**: Set up application monitoring and alerting

## Troubleshooting

### Common Issues

**Translation not working:**
- Check API keys and quotas
- Verify translation provider configuration
- Check network connectivity to translation APIs

**Messages not relaying:**
- Verify user mappings are configured correctly
- Check webhook signature validation
- Ensure both platform credentials are valid

**Webhook verification failing:**
- Verify channel secrets and tokens
- Check request signature calculation
- Ensure proper HTTPS setup

### Debug Mode

Enable debug logging:
```env
LOG_TRANSLATIONS=true
LOG_RELAY_ATTEMPTS=true
NODE_ENV=development
```

## Support

For issues and questions:
1. Check the logs for error messages
2. Verify configuration settings
3. Test with mock providers first
4. Review the test suite for examples

The system is designed to be robust and handle real-world messaging scenarios between LINE and WeChat Work platforms with automatic translation capabilities.