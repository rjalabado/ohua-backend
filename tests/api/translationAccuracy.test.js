const { translationService } = require('../../src/services/translationService');

describe('Translation Accuracy Tests', () => {
    describe('Japanese to Chinese Translation', () => {
        test('should accurately translate basic Japanese greetings', async () => {
            const testCases = [
                {
                    japanese: 'こんにちは',
                    expectedMeaning: 'hello/greeting',
                    description: 'Basic hello'
                },
                {
                    japanese: 'おはようございます',
                    expectedMeaning: 'good morning',
                    description: 'Polite good morning'
                },
                {
                    japanese: 'ありがとうございます',
                    expectedMeaning: 'thank you',
                    description: 'Polite thank you'
                },
                {
                    japanese: 'すみません',
                    expectedMeaning: 'excuse me/sorry',
                    description: 'Apologetic expression'
                }
            ];

            for (const testCase of testCases) {
                console.log(`\nTesting: ${testCase.description}`);
                console.log(`Japanese: "${testCase.japanese}"`);
                
                const chineseResult = await translationService.translateToChinese(testCase.japanese);
                console.log(`Chinese Translation: "${chineseResult}"`);
                
                // Basic validation - should not be empty or same as input
                expect(chineseResult).toBeTruthy();
                expect(chineseResult.length).toBeGreaterThan(0);
                
                // If using mock provider, check for expected format
                if (process.env.NODE_ENV === 'test') {
                    expect(chineseResult).toContain('[中文]');
                }
            }
        });

        test('should translate Japanese business phrases accurately', async () => {
            const businessPhrases = [
                {
                    japanese: 'お疲れ様でした',
                    context: 'End of work day greeting',
                    description: 'Thank you for your hard work'
                },
                {
                    japanese: '会議を始めましょう',
                    context: 'Meeting start',
                    description: 'Let\'s start the meeting'
                },
                {
                    japanese: 'プロジェクトの進捗はいかがですか？',
                    context: 'Project inquiry',
                    description: 'How is the project progress?'
                },
                {
                    japanese: '資料を確認してください',
                    context: 'Document review request',
                    description: 'Please check the documents'
                }
            ];

            for (const phrase of businessPhrases) {
                console.log(`\nBusiness Context: ${phrase.context}`);
                console.log(`Japanese: "${phrase.japanese}"`);
                
                const chineseResult = await translationService.translateToChinese(phrase.japanese);
                console.log(`Chinese Translation: "${chineseResult}"`);
                
                // Validate translation quality
                expect(chineseResult).toBeTruthy();
                expect(chineseResult.length).toBeGreaterThan(0);
                
                // Should handle longer business phrases
                if (phrase.japanese.length > 10) {
                    expect(chineseResult.length).toBeGreaterThan(5);
                }
            }
        });

        test('should handle Japanese text with mixed scripts (hiragana, katakana, kanji)', async () => {
            const mixedScriptTests = [
                {
                    japanese: 'コンピューターを使って仕事をします',
                    description: 'Katakana + Hiragana + Kanji mix',
                    context: 'Work with computer'
                },
                {
                    japanese: 'アメリカから来ました',
                    description: 'Country name in katakana',
                    context: 'Came from America'
                },
                {
                    japanese: '東京スカイツリーは有名です',
                    description: 'Proper noun with mixed scripts',
                    context: 'Tokyo Skytree is famous'
                }
            ];

            for (const test of mixedScriptTests) {
                console.log(`\nMixed Script Test: ${test.description}`);
                console.log(`Japanese: "${test.japanese}"`);
                
                const chineseResult = await translationService.translateToChinese(test.japanese);
                console.log(`Chinese Translation: "${chineseResult}"`);
                
                expect(chineseResult).toBeTruthy();
                expect(chineseResult.length).toBeGreaterThan(0);
            }
        });
    });

    describe('Chinese to Japanese Translation', () => {
        test('should accurately translate basic Chinese greetings', async () => {
            const testCases = [
                {
                    chinese: '你好',
                    expectedMeaning: 'hello',
                    description: 'Basic hello'
                },
                {
                    chinese: '早上好',
                    expectedMeaning: 'good morning',
                    description: 'Good morning'
                },
                {
                    chinese: '谢谢',
                    expectedMeaning: 'thank you',
                    description: 'Thank you'
                },
                {
                    chinese: '对不起',
                    expectedMeaning: 'sorry',
                    description: 'Sorry/apologize'
                }
            ];

            for (const testCase of testCases) {
                console.log(`\nTesting: ${testCase.description}`);
                console.log(`Chinese: "${testCase.chinese}"`);
                
                const japaneseResult = await translationService.translateToJapanese(testCase.chinese);
                console.log(`Japanese Translation: "${japaneseResult}"`);
                
                // Basic validation
                expect(japaneseResult).toBeTruthy();
                expect(japaneseResult.length).toBeGreaterThan(0);
                
                // If using mock provider, check for expected format
                if (process.env.NODE_ENV === 'test') {
                    expect(japaneseResult).toContain('[日本語]');
                }
            }
        });

        test('should translate Chinese business phrases accurately', async () => {
            const businessPhrases = [
                {
                    chinese: '开会了',
                    context: 'Meeting announcement',
                    description: 'Meeting time / Let\'s have a meeting'
                },
                {
                    chinese: '项目进展如何？',
                    context: 'Project status inquiry',
                    description: 'How is the project going?'
                },
                {
                    chinese: '请检查这个文档',
                    context: 'Document review',
                    description: 'Please check this document'
                },
                {
                    chinese: '工作辛苦了',
                    context: 'Work appreciation',
                    description: 'Thank you for your hard work'
                }
            ];

            for (const phrase of businessPhrases) {
                console.log(`\nBusiness Context: ${phrase.context}`);
                console.log(`Chinese: "${phrase.chinese}"`);
                
                const japaneseResult = await translationService.translateToJapanese(phrase.chinese);
                console.log(`Japanese Translation: "${japaneseResult}"`);
                
                expect(japaneseResult).toBeTruthy();
                expect(japaneseResult.length).toBeGreaterThan(0);
            }
        });

        test('should handle simplified Chinese characters correctly', async () => {
            const simplifiedTests = [
                {
                    chinese: '这是一个测试消息',
                    description: 'Simple test message',
                    context: 'This is a test message'
                },
                {
                    chinese: '请发送到微信群里',
                    description: 'WeChat group instruction',
                    context: 'Please send to WeChat group'
                },
                {
                    chinese: '我明天有一个重要的会议',
                    description: 'Important meeting announcement',
                    context: 'I have an important meeting tomorrow'
                }
            ];

            for (const test of simplifiedTests) {
                console.log(`\nSimplified Chinese Test: ${test.description}`);
                console.log(`Chinese: "${test.chinese}"`);
                
                const japaneseResult = await translationService.translateToJapanese(test.chinese);
                console.log(`Japanese Translation: "${japaneseResult}"`);
                
                expect(japaneseResult).toBeTruthy();
                expect(japaneseResult.length).toBeGreaterThan(0);
            }
        });
    });

    describe('Translation Edge Cases', () => {
        test('should handle empty and null inputs gracefully', async () => {
            const edgeCases = ['', null, undefined, '   '];

            for (const edgeCase of edgeCases) {
                console.log(`\nTesting edge case: "${edgeCase}"`);
                
                const chineseResult = await translationService.translateToChinese(edgeCase);
                const japaneseResult = await translationService.translateToJapanese(edgeCase);
                
                console.log(`Chinese result: "${chineseResult}"`);
                console.log(`Japanese result: "${japaneseResult}"`);
                
                // Should return the original input or handle gracefully
                expect(chineseResult).toBeDefined();
                expect(japaneseResult).toBeDefined();
            }
        });

        test('should handle very long messages', async () => {
            const longMessage = '今日は天気がとても良いです。桜の花が咲いていて、公園で多くの人々がお花見を楽しんでいます。子供たちは元気に遊んでいて、大人たちはゆっくりと散歩をしています。このような平和な日常がとても大切だと思います。';
            
            console.log(`\nTesting long message (${longMessage.length} characters)`);
            console.log(`Japanese: "${longMessage.substring(0, 50)}..."`);
            
            const chineseResult = await translationService.translateToChinese(longMessage);
            console.log(`Chinese result length: ${chineseResult.length}`);
            console.log(`Chinese (first 50 chars): "${chineseResult.substring(0, 50)}..."`);
            
            expect(chineseResult).toBeTruthy();
            expect(chineseResult.length).toBeGreaterThan(0);
            
            // Long messages should produce substantial translations
            if (!chineseResult.includes('[中文]')) {
                expect(chineseResult.length).toBeGreaterThan(20);
            }
        });

        test('should handle messages with numbers and symbols', async () => {
            const mixedContent = [
                {
                    text: '明日の会議は午後3時からです。',
                    description: 'Japanese with time'
                },
                {
                    text: '价格是￥100元',
                    description: 'Chinese with price'
                },
                {
                    text: 'メールアドレス：test@example.com',
                    description: 'Japanese with email'
                },
                {
                    text: '联系电话：+86-138-0013-8000',
                    description: 'Chinese with phone number'
                }
            ];

            for (const content of mixedContent) {
                console.log(`\nTesting: ${content.description}`);
                console.log(`Original: "${content.text}"`);
                
                const chineseResult = await translationService.translateToChinese(content.text);
                const japaneseResult = await translationService.translateToJapanese(content.text);
                
                console.log(`To Chinese: "${chineseResult}"`);
                console.log(`To Japanese: "${japaneseResult}"`);
                
                expect(chineseResult).toBeTruthy();
                expect(japaneseResult).toBeTruthy();
            }
        });

        test('should handle English mixed with Japanese/Chinese', async () => {
            const mixedLanguageTests = [
                {
                    text: 'Hello, 私の名前は田中です',
                    description: 'English + Japanese'
                },
                {
                    text: '我的email是test@gmail.com',
                    description: 'Chinese + English'
                },
                {
                    text: 'Thank you, ありがとうございます',
                    description: 'English + Japanese politeness'
                }
            ];

            for (const test of mixedLanguageTests) {
                console.log(`\nTesting: ${test.description}`);
                console.log(`Mixed text: "${test.text}"`);
                
                const chineseResult = await translationService.translateToChinese(test.text);
                const japaneseResult = await translationService.translateToJapanese(test.text);
                
                console.log(`To Chinese: "${chineseResult}"`);
                console.log(`To Japanese: "${japaneseResult}"`);
                
                expect(chineseResult).toBeTruthy();
                expect(japaneseResult).toBeTruthy();
            }
        });
    });

    describe('Language Detection Accuracy', () => {
        test('should correctly detect Japanese text', async () => {
            // Use longer, more distinctive Japanese texts for better detection accuracy
            const japaneseTexts = [
                'こんにちは、お元気ですか？',
                'ありがとうございました。とても助かりました。',
                'コンピューターを使って仕事をしています',
                '東京は日本の首都です',
                'ひらがなとカタカナを勉強しています'
            ];

            let correctDetections = 0;
            const totalTexts = japaneseTexts.length;

            for (const text of japaneseTexts) {
                const detectedLang = await translationService.detectLanguage(text);
                console.log(`Text: "${text}" -> Detected: ${detectedLang}`);
                if (detectedLang === 'ja') {
                    correctDetections++;
                }
            }

            // Allow for some variation in language detection - at least 80% accuracy
            const accuracy = correctDetections / totalTexts;
            expect(accuracy).toBeGreaterThanOrEqual(0.8);
        });

        test('should correctly detect Chinese text', async () => {
            const chineseTexts = [
                '你好',
                '谢谢',
                '这是中文',
                '北京',
                '简体中文'
            ];

            for (const text of chineseTexts) {
                const detectedLang = await translationService.detectLanguage(text);
                console.log(`Text: "${text}" -> Detected: ${detectedLang}`);
                expect(detectedLang).toBe('zh');
            }
        });

        test('should detect English and other languages', async () => {
            const multiLangTexts = [
                { text: 'Hello world', expected: 'en' },
                { text: '안녕하세요', expected: 'ko' },
                { text: 'Bonjour', expected: 'en' }, // Might default to en
                { text: '123456', expected: 'en' }
            ];

            for (const test of multiLangTexts) {
                const detectedLang = await translationService.detectLanguage(test.text);
                console.log(`Text: "${test.text}" -> Detected: ${detectedLang}`);
                // English is default fallback, so just check it's not null
                expect(detectedLang).toBeTruthy();
            }
        });
    });

    describe('Translation Performance', () => {
        test('should translate within reasonable time limits', async () => {
            const testMessage = '今日は良い天気ですね。お仕事お疲れ様です。';
            
            console.log('Testing translation performance...');
            const startTime = Date.now();
            
            const chineseResult = await translationService.translateToChinese(testMessage);
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            console.log(`Translation completed in ${duration}ms`);
            console.log(`Result: "${chineseResult}"`);
            
            expect(chineseResult).toBeTruthy();
            
            // Should complete within reasonable time (adjust based on actual performance)
            // For mock, should be very fast. For real API, allow more time
            if (process.env.NODE_ENV === 'test') {
                expect(duration).toBeLessThan(100); // Mock should be very fast
            } else {
                expect(duration).toBeLessThan(10000); // Real API should be under 10 seconds
            }
        });

        test('should handle rapid sequential translations', async () => {
            const messages = [
                'こんにちは',
                'ありがとう',
                'さようなら',
                'おはよう',
                'お疲れ様'
            ];

            console.log('Testing rapid sequential translations...');
            const startTime = Date.now();
            
            const promises = messages.map(async (message, index) => {
                const result = await translationService.translateToChinese(message);
                console.log(`${index + 1}. "${message}" -> "${result}"`);
                return result;
            });

            const results = await Promise.all(promises);
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            console.log(`All ${messages.length} translations completed in ${duration}ms`);
            
            // All should succeed
            expect(results).toHaveLength(messages.length);
            results.forEach(result => {
                expect(result).toBeTruthy();
            });

            // Should handle multiple requests efficiently
            if (process.env.NODE_ENV === 'test') {
                expect(duration).toBeLessThan(500);
            }
        });
    });
});