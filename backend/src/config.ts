/**
 * Global Backend Configuration
 *
 * Centralized config for feature flags, provider toggles,
 * extractor settings, and API keys.
 */

export const config = {
    /** Provider flags — controls which URL parsers are active */
    providers: {
        youtube:   true,
        twitter:   true,
        instagram: true,
        github:    true,
        medium:    true,
        notion:    true,
    },

    /** Extractor settings — controls background metadata enrichment */
    extractors: {
        enabled: true,
        pollIntervalMs: 30_000,       // 30 seconds
        maxRetries: 3,
        retryDelayMs: 60_000,         // 1 minute between retries
    },

    /** API keys for provider data extraction */
    apiKeys: {
        youtubeApiKey:      process.env.YOUTUBE_API_KEY || '',
        githubToken:        process.env.GITHUB_TOKEN || '',
        twitterBearerToken: process.env.TWITTER_BEARER_TOKEN || '',
        instagramAppId:     process.env.INSTAGRAM_APP_ID || '',
    },
};
