/**
 * Generic Link Provider (Fallback)
 *
 * This provider handles any URL that isn't matched by a specific provider.
 * It acts as a catch-all fallback, ensuring users can save any valid URL
 * to their brain, even if we don't have special handling for that platform.
 *
 * Features:
 * - Accepts any valid HTTP/HTTPS URL
 * - Generates a unique hash-based ID for the URL
 * - Displays as a link card (no embedding)
 * - Stores the full original URL for reference
 *
 * This ensures users have no restrictions on what they can save.
 */

import crypto from 'crypto';
import { ContentProvider } from './base';

export const genericProvider: ContentProvider = {
    type: 'link',
    displayName: 'Link',
    hostnames: [], // Empty - matches any hostname as fallback
    supportsEmbed: false,
    embedType: 'card', // Displays as a link preview card

    /**
     * Generic provider always returns true as it's the fallback.
     * It should be registered LAST in the providers array.
     *
     * @param url - Any valid URL
     * @returns Always true
     */
    canHandle(url: URL): boolean {
        // Only handle HTTP and HTTPS protocols
        return url.protocol === 'http:' || url.protocol === 'https:';
    },

    /**
     * Generate a unique ID for the URL using MD5 hash.
     *
     * Since we can't extract a meaningful content ID from arbitrary URLs,
     * we generate a hash of the full URL. This provides:
     * - Consistent IDs for the same URL
     * - Collision resistance
     * - Reasonable length for storage
     *
     * Note: For generic links, we also store the full URL separately
     * since we can't reconstruct it from just the hash.
     *
     * @param url - Any valid URL
     * @returns 12-character hash string
     */
    extractId(url: URL): string | null {
        // Use MD5 hash of the full URL, truncated to 12 characters
        // MD5 is fine here since we're not using it for security
        const hash = crypto
            .createHash('md5')
            .update(url.href)
            .digest('hex')
            .slice(0, 12);

        return hash;
    },

    /**
     * Generic links don't support embedding.
     * This method returns undefined, which signals to the frontend
     * to display a link card instead.
     */
    getEmbedUrl: undefined,

    /**
     * For generic links, the canonical URL is the original URL itself.
     *
     * Note: Since we hash the URL to create the ID, we can't reconstruct
     * the original URL from just the ID. The original URL must be stored
     * separately in the database's `link` field.
     *
     * This method is a placeholder - the actual URL retrieval happens
     * via the stored `link` field in the content document.
     *
     * @param contentId - The hash-based ID (not used for reconstruction)
     * @returns The contentId itself (actual URL comes from DB)
     */
    getCanonicalUrl(contentId: string): string {
        // For generic links, the canonical URL is stored in the `link` field
        // This returns the contentId as a fallback, but actual usage
        // should prefer the stored `link` value
        return contentId;
    }
};
