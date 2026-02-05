/**
 * YouTube Content Provider (Frontend)
 *
 * Handles all YouTube URL formats including:
 * - Standard watch URLs: youtube.com/watch?v=VIDEO_ID
 * - Short URLs: youtu.be/VIDEO_ID
 * - Shorts: youtube.com/shorts/VIDEO_ID
 * - Live streams: youtube.com/live/VIDEO_ID
 * - Embeds: youtube.com/embed/VIDEO_ID
 * - Mobile: m.youtube.com/watch?v=VIDEO_ID
 */

import type { ContentProvider } from './base';

/** YouTube video IDs are exactly 11 characters */
const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/** Valid YouTube hostnames */
const YOUTUBE_HOSTNAMES = [
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtu.be',
    'www.youtu.be'
];

/** URL path patterns that contain video IDs */
const VIDEO_PATH_PATTERNS = ['/shorts/', '/live/', '/embed/', '/v/'];

export const youtubeProvider: ContentProvider = {
    type: 'youtube',
    displayName: 'YouTube',
    hostnames: YOUTUBE_HOSTNAMES,
    supportsEmbed: true,
    embedType: 'iframe',

    canHandle(url: URL): boolean {
        const hostname = url.hostname.toLowerCase();
        return this.hostnames.some(h => hostname === h || hostname.endsWith('.' + h));
    },

    extractId(url: URL): string | null {
        const hostname = url.hostname.toLowerCase();
        const pathname = url.pathname;

        let videoId: string | null = null;

        // Handle youtu.be/VIDEO_ID format
        if (hostname === 'youtu.be' || hostname === 'www.youtu.be') {
            const pathParts = pathname.slice(1).split('/');
            videoId = pathParts[0] || null;
        }
        // Handle youtube.com/watch?v=VIDEO_ID format
        else if (pathname === '/watch') {
            videoId = url.searchParams.get('v');
        }
        // Handle path-based formats
        else {
            for (const pattern of VIDEO_PATH_PATTERNS) {
                if (pathname.startsWith(pattern)) {
                    const afterPattern = pathname.slice(pattern.length);
                    videoId = afterPattern.split('/')[0] || null;
                    break;
                }
            }
        }

        // Validate extracted ID
        if (videoId && YOUTUBE_ID_REGEX.test(videoId)) {
            return videoId;
        }

        return null;
    },

    getEmbedUrl(contentId: string): string {
        return `https://www.youtube.com/embed/${contentId}`;
    },

    getCanonicalUrl(contentId: string): string {
        return `https://www.youtube.com/watch?v=${contentId}`;
    }
};
