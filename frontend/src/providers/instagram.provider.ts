/**
 * Instagram Content Provider (Frontend)
 *
 * Handles Instagram URL formats:
 * - Posts: instagram.com/p/{shortcode}/
 * - Reels: instagram.com/reel/{shortcode}/
 * - TV (IGTV): instagram.com/tv/{shortcode}/
 */

import type { ContentProvider } from './base';

const INSTAGRAM_SHORTCODE_REGEX = /^[a-zA-Z0-9_-]{8,14}$/;

const INSTAGRAM_HOSTNAMES = [
    'instagram.com',
    'www.instagram.com',
    'm.instagram.com',
];

export const instagramProvider: ContentProvider = {
    type: 'instagram',
    displayName: 'Instagram',
    hostnames: INSTAGRAM_HOSTNAMES,
    supportsEmbed: true,
    embedType: 'oembed',

    canHandle(url: URL): boolean {
        const hostname = url.hostname.toLowerCase();
        return this.hostnames.includes(hostname);
    },

    extractId(url: URL): string | null {
        const pathParts = url.pathname.split('/').filter(Boolean);

        if (pathParts.length >= 2 && ['p', 'reel', 'tv'].includes(pathParts[0])) {
            const shortcode = pathParts[1];
            if (INSTAGRAM_SHORTCODE_REGEX.test(shortcode)) {
                return shortcode;
            }
        }

        return null;
    },

    getEmbedUrl(contentId: string): string {
        return `https://www.instagram.com/p/${contentId}/embed`;
    },

    getCanonicalUrl(contentId: string): string {
        return `https://www.instagram.com/p/${contentId}/`;
    }
};
