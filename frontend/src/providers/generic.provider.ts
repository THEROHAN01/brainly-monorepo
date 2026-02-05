/**
 * Generic Link Provider (Frontend Fallback)
 *
 * Handles any URL that isn't matched by a specific provider.
 * Acts as a catch-all fallback, ensuring users can save any valid URL.
 */

import type { ContentProvider } from './base';

/**
 * Simple hash function for generating IDs in browser.
 * Uses a basic string hash algorithm - not cryptographically secure
 * but sufficient for generating consistent short IDs.
 */
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert to hex and take absolute value, pad to 12 chars
    return Math.abs(hash).toString(16).padStart(8, '0').slice(0, 12);
}

export const genericProvider: ContentProvider = {
    type: 'link',
    displayName: 'Link',
    hostnames: [], // Matches any hostname as fallback
    supportsEmbed: false,
    embedType: 'card',

    canHandle(url: URL): boolean {
        // Only handle HTTP and HTTPS protocols
        return url.protocol === 'http:' || url.protocol === 'https:';
    },

    extractId(url: URL): string | null {
        // Generate a simple hash of the URL as ID
        return simpleHash(url.href);
    },

    // Generic links don't support embedding
    getEmbedUrl: undefined,

    getCanonicalUrl(contentId: string): string {
        // For generic links, canonical URL comes from stored link field
        return contentId;
    }
};
