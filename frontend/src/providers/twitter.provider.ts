/**
 * Twitter/X Content Provider (Frontend)
 *
 * Handles all Twitter and X URL formats:
 * - Standard: twitter.com/username/status/TWEET_ID
 * - X domain: x.com/username/status/TWEET_ID
 * - Mobile: mobile.twitter.com/username/status/TWEET_ID
 */

import type { ContentProvider } from './base';

/** Tweet IDs are numeric strings up to 19 digits */
const TWEET_ID_REGEX = /^\d{1,19}$/;

/** Valid Twitter/X hostnames */
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
    embedType: 'oembed',

    canHandle(url: URL): boolean {
        const hostname = url.hostname.toLowerCase();
        return this.hostnames.includes(hostname);
    },

    extractId(url: URL): string | null {
        const pathParts = url.pathname.split('/').filter(Boolean);

        // Expected format: [username, 'status', tweetId]
        if (pathParts.length >= 3 && pathParts[1] === 'status') {
            const tweetId = pathParts[2];

            if (TWEET_ID_REGEX.test(tweetId)) {
                return tweetId;
            }
        }

        return null;
    },

    getEmbedUrl(contentId: string): string {
        return `https://twitter.com/i/status/${contentId}`;
    },

    getCanonicalUrl(contentId: string): string {
        return `https://twitter.com/i/status/${contentId}`;
    }
};
