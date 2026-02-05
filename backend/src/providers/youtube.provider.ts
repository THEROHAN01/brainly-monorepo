/**
 * YouTube Content Provider
 *
 * Handles all YouTube URL formats including:
 * - Standard watch URLs: youtube.com/watch?v=VIDEO_ID
 * - Short URLs: youtu.be/VIDEO_ID
 * - Shorts: youtube.com/shorts/VIDEO_ID
 * - Live streams: youtube.com/live/VIDEO_ID
 * - Embeds: youtube.com/embed/VIDEO_ID
 * - Mobile: m.youtube.com/watch?v=VIDEO_ID
 * - Legacy: youtube.com/v/VIDEO_ID
 *
 * Also handles URLs with additional parameters like:
 * - Timestamps: &t=120 or &t=2m30s
 * - Playlists: &list=PLAYLIST_ID
 * - Other tracking params
 */

import { ContentProvider } from './base';

/**
 * YouTube video IDs are exactly 11 characters long,
 * consisting of alphanumeric characters, hyphens, and underscores.
 */
const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Valid YouTube hostnames including www and mobile variants.
 */
const YOUTUBE_HOSTNAMES = [
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtu.be',
    'www.youtu.be'
];

/**
 * URL path patterns that contain video IDs.
 * The ID follows immediately after these patterns.
 */
const VIDEO_PATH_PATTERNS = ['/shorts/', '/live/', '/embed/', '/v/'];

export const youtubeProvider: ContentProvider = {
    type: 'youtube',
    displayName: 'YouTube',
    hostnames: YOUTUBE_HOSTNAMES,
    supportsEmbed: true,
    embedType: 'iframe',

    /**
     * Check if URL belongs to YouTube.
     * Uses hostname matching for quick filtering.
     */
    canHandle(url: URL): boolean {
        const hostname = url.hostname.toLowerCase();
        return this.hostnames.some(h => hostname === h || hostname.endsWith('.' + h));
    },

    /**
     * Extract YouTube video ID from various URL formats.
     *
     * Supported formats:
     * - youtu.be/VIDEO_ID
     * - youtube.com/watch?v=VIDEO_ID
     * - youtube.com/shorts/VIDEO_ID
     * - youtube.com/live/VIDEO_ID
     * - youtube.com/embed/VIDEO_ID
     * - youtube.com/v/VIDEO_ID
     *
     * @param url - Parsed URL object
     * @returns 11-character video ID or null
     */
    extractId(url: URL): string | null {
        const hostname = url.hostname.toLowerCase();
        const pathname = url.pathname;

        let videoId: string | null = null;

        // Handle youtu.be/VIDEO_ID format (short URLs)
        if (hostname === 'youtu.be' || hostname === 'www.youtu.be') {
            // Remove leading slash and get first path segment
            const pathParts = pathname.slice(1).split('/');
            videoId = pathParts[0] || null;
        }
        // Handle youtube.com/watch?v=VIDEO_ID format (most common)
        else if (pathname === '/watch') {
            videoId = url.searchParams.get('v');
        }
        // Handle path-based formats: /shorts/, /live/, /embed/, /v/
        else {
            for (const pattern of VIDEO_PATH_PATTERNS) {
                if (pathname.startsWith(pattern)) {
                    // Extract ID from path after the pattern
                    const afterPattern = pathname.slice(pattern.length);
                    // Split by / in case there are trailing segments
                    videoId = afterPattern.split('/')[0] || null;
                    break;
                }
            }
        }

        // Validate extracted ID matches YouTube's format
        if (videoId && YOUTUBE_ID_REGEX.test(videoId)) {
            return videoId;
        }

        return null;
    },

    /**
     * Generate YouTube embed URL from video ID.
     * Uses the standard /embed/ format for iframe embedding.
     *
     * @param contentId - YouTube video ID
     * @returns Embed URL for iframe
     */
    getEmbedUrl(contentId: string): string {
        return `https://www.youtube.com/embed/${contentId}`;
    },

    /**
     * Generate canonical YouTube URL from video ID.
     * Uses the standard /watch?v= format.
     *
     * @param contentId - YouTube video ID
     * @returns Canonical watch URL
     */
    getCanonicalUrl(contentId: string): string {
        return `https://www.youtube.com/watch?v=${contentId}`;
    }
};
