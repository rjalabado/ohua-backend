// Configuration settings (e.g., API keys, endpoints)

module.exports = {
    lineChannelSecret: process.env.LINE_CHANNEL_SECRET,
    lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    wechatAppId: process.env.WECHAT_APP_ID,
    wechatAppSecret: process.env.WECHAT_APP_SECRET,
    openAiApiKey: process.env.OPENAI_API_KEY,
    azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING
};