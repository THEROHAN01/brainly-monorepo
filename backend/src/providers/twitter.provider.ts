/**
 * Twitter/X Content Provider
 *
 * Handles all Twitter and X (formerly Twitter) URL formats:
 * - Standard: twitter.com/username/status/TWEET_ID
 * - X domain: x.com/username/status/TWEET_ID
 * - Mobile: mobile.twitter.com/username/status/TWEET_ID
 * - With www: www.twitter.com/username/status/TWEET_ID
 *
 * Also handles URLs with query parameters like:
 * - Sharing params: ?s=20
 * - Referrer tracking: ?ref_src=...
 *
 * Note: Twitter embeds use the oEmbed/widget system rather than iframes.
 * The Twitter widget.js script handles rendering the tweet.
 */

import { ContentProvider } from './base';

/**
 * Tweet IDs are numeric strings, can be up to 19 digits.
 * Twitter uses Snowflake IDs which are 64-bit integers.
 */
const TWEET_ID_REGEX = /^\d{1,19}$/;

/**
 * Valid Twitter/X hostnames including www and mobile variants.
 * Includes both twitter.com and x.com (rebranded) domains.
 */
const TWITTER_HOSTNAMES = [
    'twitter.com',
    'www.twitter.com',
    'mobile.twitter.com',
    'x.com',
    'www.x.com',
    'mobile.x.com'
];

export const twitterProvider: ContentProvider = {
    type: 'twitter',
    displayName: 'Twitter',
    hostnames: TWITTER_HOSTNAMES,
    supportsEmbed: true,
    embedType: 'oembed', // Uses Twitter widget for rendering

    /**
     * Check if URL belongs to Twitter/X.
     * Uses hostname matching for quick filtering.
     */
    canHandle(url: URL): boolean {
        const hostname = url.hostname.toLowerCase();
        return this.hostnames.includes(hostname);
    },

    /**
     * Extract tweet ID from Twitter/X URL.
     *
     * URL format: /{username}/status/{tweet_id}
     * The username is required in the path but we only extract the tweet ID.
     *
     * Examples:
     * - twitter.com/elonmusk/status/1234567890123456789
     * - x.com/OpenAI/status/1234567890123456789?s=20
     *
     * @param url - Parsed URL object
     * @returns Tweet ID string or null
     */
    extractId(url: URL): string | null {
        // Split pathname and filter out empty segments
        const pathParts = url.pathname.split('/').filter(Boolean);

        // Expected format: [username, 'status', tweetId, ...optional]
        // Minimum 3 parts required: username, 'status', and the ID
        if (pathParts.length >= 3 && pathParts[1] === 'status') {
            const tweetId = pathParts[2];

            // Validate tweet ID is numeric and within valid range
            if (TWEET_ID_REGEX.test(tweetId)) {
                return tweetId;
            }
        }

        return null;
    },

    /**
     * Generate Twitter embed URL from tweet ID.
     *
     * Uses the /i/status/ format which works without knowing the username.
     * This is the format Twitter's widget system recognizes.
     *
     * @param contentId - Tweet ID
     * @returns Embed URL for Twitter widget
     */
    getEmbedUrl(contentId: string): string {
        // Using twitter.com for embeds as it's more reliable for widgets
        return `https://twitter.com/i/status/${contentId}`;
    },

    /**
     * Generate canonical Twitter URL from tweet ID.
     *
     * Uses the /i/status/ format which redirects to the full URL with username.
     * This works even without knowing the original poster's username.
     *
     * @param contentId - Tweet ID
     * @returns Canonical URL
     */
    getCanonicalUrl(contentId: string): string {
        return `https://twitter.com/i/status/${contentId}`;
    }
};
