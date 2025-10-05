/**
 * User mapping service for managing relationships between LINE and WeChat users
 * This service handles the mapping of users across different messaging platforms
 */

class UserMappingService {
    constructor() {
        // In-memory storage for now - in production, use a database
        this.lineToChatMappings = new Map(); // LINE user ID -> WeChat user ID(s)
        this.wechatToLineMappings = new Map(); // WeChat user ID -> LINE user ID(s)
        this.groupMappings = new Map(); // LINE group ID -> WeChat group ID
        this.userProfiles = new Map(); // Store user profiles for better mapping
    }

    /**
     * Map a LINE user to a WeChat user
     * @param {string} lineUserId - LINE user ID
     * @param {string} wechatUserId - WeChat user ID
     * @param {Object} options - Additional mapping options
     */
    mapLineToWeChat(lineUserId, wechatUserId, options = {}) {
        if (!lineUserId || !wechatUserId) {
            console.error('Both LINE and WeChat user IDs are required for mapping');
            return false;
        }

        try {
            // Store bidirectional mapping
            this.lineToChatMappings.set(lineUserId, {
                wechatUserId,
                mappedAt: new Date(),
                ...options
            });

            this.wechatToLineMappings.set(wechatUserId, {
                lineUserId,
                mappedAt: new Date(),
                ...options
            });

            console.log(`User mapping created: LINE ${lineUserId} <-> WeChat ${wechatUserId}`);
            return true;
        } catch (error) {
            console.error('Error creating user mapping:', error);
            return false;
        }
    }

    /**
     * Get WeChat user ID from LINE user ID
     * @param {string} lineUserId - LINE user ID
     * @returns {string|null} - WeChat user ID or null if not found
     */
    getWeChatUserFromLine(lineUserId) {
        const mapping = this.lineToChatMappings.get(lineUserId);
        return mapping ? mapping.wechatUserId : null;
    }

    /**
     * Get LINE user ID from WeChat user ID
     * @param {string} wechatUserId - WeChat user ID
     * @returns {string|null} - LINE user ID or null if not found
     */
    getLineUserFromWeChat(wechatUserId) {
        const mapping = this.wechatToLineMappings.get(wechatUserId);
        return mapping ? mapping.lineUserId : null;
    }

    /**
     * Map LINE group to WeChat group
     * @param {string} lineGroupId - LINE group ID
     * @param {string} wechatGroupId - WeChat group ID
     */
    mapGroups(lineGroupId, wechatGroupId) {
        if (!lineGroupId || !wechatGroupId) {
            console.error('Both LINE and WeChat group IDs are required for mapping');
            return false;
        }

        this.groupMappings.set(lineGroupId, wechatGroupId);
        console.log(`Group mapping created: LINE ${lineGroupId} <-> WeChat ${wechatGroupId}`);
        return true;
    }

    /**
     * Get WeChat group ID from LINE group ID
     * @param {string} lineGroupId - LINE group ID
     * @returns {string|null} - WeChat group ID or null if not found
     */
    getWeChatGroupFromLine(lineGroupId) {
        return this.groupMappings.get(lineGroupId) || null;
    }

    /**
     * Store user profile information for better mapping
     * @param {string} platform - 'line' or 'wechat'
     * @param {string} userId - User ID
     * @param {Object} profile - User profile data
     */
    storeUserProfile(platform, userId, profile) {
        const key = `${platform}:${userId}`;
        this.userProfiles.set(key, {
            ...profile,
            platform,
            userId,
            updatedAt: new Date()
        });
        
        console.log(`Stored ${platform} profile for user ${userId}`);
    }

    /**
     * Get user profile
     * @param {string} platform - 'line' or 'wechat'
     * @param {string} userId - User ID
     * @returns {Object|null} - User profile or null if not found
     */
    getUserProfile(platform, userId) {
        const key = `${platform}:${userId}`;
        return this.userProfiles.get(key) || null;
    }

    /**
     * Auto-map users based on similar profiles (name, email, etc.)
     * @param {string} lineUserId - LINE user ID
     * @param {string} wechatUserId - WeChat user ID
     * @returns {boolean} - True if auto-mapping was successful
     */
    attemptAutoMapping(lineUserId, wechatUserId) {
        const lineProfile = this.getUserProfile('line', lineUserId);
        const wechatProfile = this.getUserProfile('wechat', wechatUserId);

        if (!lineProfile || !wechatProfile) {
            console.log('Insufficient profile data for auto-mapping');
            return false;
        }

        // Simple similarity check based on display name
        const lineName = lineProfile.displayName?.toLowerCase() || '';
        const wechatName = wechatProfile.displayName?.toLowerCase() || '';

        if (lineName && wechatName && this._calculateSimilarity(lineName, wechatName) > 0.8) {
            console.log(`Auto-mapping users based on name similarity: ${lineName} ~ ${wechatName}`);
            return this.mapLineToWeChat(lineUserId, wechatUserId, { autoMapped: true });
        }

        return false;
    }

    /**
     * Remove user mapping
     * @param {string} lineUserId - LINE user ID
     */
    removeMapping(lineUserId) {
        const mapping = this.lineToChatMappings.get(lineUserId);
        if (mapping) {
            this.lineToChatMappings.delete(lineUserId);
            this.wechatToLineMappings.delete(mapping.wechatUserId);
            console.log(`Removed mapping for LINE user ${lineUserId}`);
            return true;
        }
        return false;
    }

    /**
     * Get all mappings for debugging/admin purposes
     * @returns {Object} - All current mappings
     */
    getAllMappings() {
        return {
            lineToWeChat: Object.fromEntries(this.lineToChatMappings),
            wechatToLine: Object.fromEntries(this.wechatToLineMappings),
            groups: Object.fromEntries(this.groupMappings),
            totalMappings: this.lineToChatMappings.size
        };
    }

    /**
     * Load mappings from configuration/database
     * This would typically load from persistent storage in production
     */
    loadMappingsFromConfig() {
        try {
            const mappingConfig = process.env.USER_MAPPINGS;
            if (mappingConfig) {
                const mappings = JSON.parse(mappingConfig);
                
                if (mappings.users && Array.isArray(mappings.users)) {
                    mappings.users.forEach(mapping => {
                        this.mapLineToWeChat(mapping.lineUserId, mapping.wechatUserId, {
                            source: 'config'
                        });
                    });
                }

                if (mappings.groups && Array.isArray(mappings.groups)) {
                    mappings.groups.forEach(mapping => {
                        this.mapGroups(mapping.lineGroupId, mapping.wechatGroupId);
                    });
                }

                console.log(`Loaded ${mappings.users?.length || 0} user mappings and ${mappings.groups?.length || 0} group mappings from config`);
            }
        } catch (error) {
            console.error('Error loading mappings from config:', error);
        }
    }

    /**
     * Create a default mapping for testing
     */
    createTestMappings() {
        console.log('Creating test user mappings...');
        
        // Example test mappings - replace with real user IDs
        this.mapLineToWeChat('line_test_user_1', 'wechat_test_user_1', { source: 'test' });
        this.mapLineToWeChat('line_test_user_2', 'wechat_test_user_2', { source: 'test' });
        
        this.mapGroups('line_test_group_1', 'wechat_test_group_1');
    }

    /**
     * Calculate string similarity (simple implementation)
     * @private
     */
    _calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        const editDistance = this._levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    /**
     * Calculate Levenshtein distance
     * @private
     */
    _levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }
}

// Singleton instance
const userMappingService = new UserMappingService();

// Load mappings on startup
userMappingService.loadMappingsFromConfig();

// Create test mappings if in development mode
if (process.env.NODE_ENV === 'development' || process.env.CREATE_TEST_MAPPINGS === 'true') {
    userMappingService.createTestMappings();
}

module.exports = {
    UserMappingService,
    userMappingService
};