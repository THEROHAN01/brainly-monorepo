/**
 * Content Provider Registry
 *
 * This module serves as the central registry for all content providers.
 * It provides functions to:
 * - Auto-detect content type from URLs
 * - Parse URLs and extract content IDs
 * - Retrieve providers by type
 * - List all available provider types
 *
 * ADDING NEW PROVIDERS:
 * To add support for a new platform (e.g., Spotify):
 * 1. Create a new provider file: spotify.provider.ts
 * 2. Import it here
 * 3. Add it to the `providers` array BEFORE genericProvider
 *
 * The order of providers matters - they are tried in sequence,
 * and the first matching provider is used. The generic provider
 * should always be LAST as it matches any URL.
 */

import { ContentProvider, ParsedContent } from './base';
import { youtubeProvider } from './youtube.provider';
import { twitterProvider } from './twitter.provider';
import { genericProvider } from './generic.provider';

/**
 * Registered content providers in priority order.
 *
 * IMPORTANT: Order matters! Providers are tried in sequence.
 * More specific providers should come before less specific ones.
 * The generic provider MUST be last as it matches any URL.
 *
 * To add new providers, import them and add to this array.
 */
const providers: ContentProvider[] = [
    // Specific platform providers (add new ones here)
    youtubeProvider,
    twitterProvider,

    // Future providers - uncomment and import when implemented:
    // notionProvider,
    // mediumProvider,
    // redditProvider,
    // instagramProvider,
    // spotifyProvider,
    // githubProvider,

    // Generic fallback - MUST be last (catches everything)
    genericProvider,
];

/**
 * Get a provider by its type identifier.
 *
 * @param type - Provider type (e.g., 'youtube', 'twitter', 'link')
 * @returns The provider instance or undefined if not found
 *
 * @example
 * const ytProvider = getProvider('youtube');
 * const embedUrl = ytProvider?.getEmbedUrl?.('dQw4w9WgXcQ');
 */
export function getProvider(type: string): ContentProvider | undefined {
    return providers.find(p => p.type === type);
}

/**
 * Get list of all registered provider types.
 * Useful for API responses listing supported platforms.
 *
 * @returns Array of provider type strings
 *
 * @example
 * // Returns: ['youtube', 'twitter', 'link']
 * const types = getProviderTypes();
 */
export function getProviderTypes(): string[] {
    return providers.map(p => p.type);
}

/**
 * Get list of all registered providers with their metadata.
 * Useful for displaying supported platforms in the UI.
 *
 * @returns Array of provider info objects
 */
export function getProviderInfo(): Array<{
    type: string;
    displayName: string;
    supportsEmbed: boolean;
}> {
    return providers.map(p => ({
        type: p.type,
        displayName: p.displayName,
        supportsEmbed: p.supportsEmbed
    }));
}

/**
 * Parse a URL string and auto-detect its content type.
 *
 * This is the main entry point for URL processing. It:
 * 1. Validates the URL format
 * 2. Tries each provider in order until one matches
 * 3. Extracts the content ID using the matched provider
 * 4. Returns complete parsed content information
 *
 * @param urlString - Raw URL string from user input
 * @returns ParsedContent object with all extracted info, or null if invalid
 *
 * @example
 * const result = parseUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
 * // Returns: {
 * //   type: 'youtube',
 * //   displayName: 'YouTube',
 * //   contentId: 'dQw4w9WgXcQ',
 * //   originalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
 * //   embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
 * //   canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
 * //   canEmbed: true,
 * //   embedType: 'iframe'
 * // }
 */
export function parseUrl(urlString: string): ParsedContent | null {
    // Validate and parse URL
    let url: URL;
    try {
        url = new URL(urlString);
    } catch {
        // Invalid URL format
        return null;
    }

    // Try each provider in order
    for (const provider of providers) {
        if (provider.canHandle(url)) {
            const contentId = provider.extractId(url);

            if (contentId) {
                // Successfully parsed - build result object
                return {
                    type: provider.type,
                    displayName: provider.displayName,
                    contentId,
                    originalUrl: urlString,
                    embedUrl: provider.getEmbedUrl?.(contentId),
                    canonicalUrl: provider.getCanonicalUrl(contentId),
                    canEmbed: provider.supportsEmbed,
                    embedType: provider.embedType
                };
            }
        }
    }

    // No provider could parse the URL (shouldn't happen with generic fallback)
    return null;
}

/**
 * Validate a URL without fully parsing it.
 * Faster than parseUrl when you just need to check validity.
 *
 * @param urlString - Raw URL string to validate
 * @returns true if URL is valid and can be handled
 */
export function isValidUrl(urlString: string): boolean {
    try {
        const url = new URL(urlString);
        // Check for HTTP/HTTPS protocol
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

// Re-export base types for convenience
export * from './base';

// Export individual providers for direct access if needed
export { youtubeProvider, twitterProvider, genericProvider };
