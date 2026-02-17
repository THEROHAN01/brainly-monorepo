/**
 * Content Provider Registry (Frontend)
 *
 * Central registry for all content providers.
 * Providers are conditionally registered based on feature flags.
 *
 * ADDING NEW PROVIDERS:
 * 1. Create a new provider file: {name}.provider.ts
 * 2. Import it here
 * 3. Add it to the `providerMap` with its config flag key
 * 4. Add the flag to config/providers.ts
 */

import type { ContentProvider, ParsedContent, ValidationResult } from './base';
import { providerConfig } from '../config/providers';
import { youtubeProvider } from './youtube.provider';
import { twitterProvider } from './twitter.provider';
import { instagramProvider } from './instagram.provider';
import { githubProvider } from './github.provider';
import { mediumProvider } from './medium.provider';
import { notionProvider } from './notion.provider';
import { genericProvider } from './generic.provider';

/**
 * Map of provider config flag key to provider instance.
 * Order matters — more specific providers first.
 */
const providerMap: Array<{ key: keyof typeof providerConfig; provider: ContentProvider }> = [
    { key: 'youtube',   provider: youtubeProvider },
    { key: 'twitter',   provider: twitterProvider },
    { key: 'instagram', provider: instagramProvider },
    { key: 'github',    provider: githubProvider },
    { key: 'medium',    provider: mediumProvider },
    { key: 'notion',    provider: notionProvider },
];

/**
 * Build the active providers list based on config flags.
 * Generic fallback is always included at the end.
 */
const providers: ContentProvider[] = [
    ...providerMap
        .filter(({ key }) => providerConfig[key])
        .map(({ provider }) => provider),
    genericProvider, // Always last
];

/**
 * Get a provider by its type identifier.
 */
export function getProvider(type: string): ContentProvider | undefined {
    return providers.find(p => p.type === type);
}

/**
 * Get list of all registered provider types.
 */
export function getProviderTypes(): string[] {
    return providers.map(p => p.type);
}

/**
 * Get provider info for UI display.
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
 */
export function parseUrl(urlString: string): ParsedContent | null {
    let url: URL;
    try {
        url = new URL(urlString);
    } catch {
        return null;
    }

    for (const provider of providers) {
        if (provider.canHandle(url)) {
            const contentId = provider.extractId(url);

            if (contentId) {
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

    return null;
}

/**
 * Quick validation for instant UI feedback.
 */
export function quickValidateUrl(urlString: string): ValidationResult {
    if (!urlString || urlString.trim() === '') {
        return { valid: false, message: 'URL is required' };
    }

    const parsed = parseUrl(urlString);

    if (!parsed) {
        return {
            valid: false,
            message: 'Invalid URL format. Please enter a valid URL.'
        };
    }

    return {
        valid: true,
        type: parsed.type,
        displayName: parsed.displayName,
        contentId: parsed.contentId,
        embedUrl: parsed.embedUrl,
        canEmbed: parsed.canEmbed,
        embedType: parsed.embedType
    };
}

/**
 * Check if a URL string is valid.
 */
export function isValidUrl(urlString: string): boolean {
    try {
        const url = new URL(urlString);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Get embed URL for content by type and ID.
 */
export function getEmbedUrl(type: string, contentId: string): string | undefined {
    const provider = getProvider(type);
    return provider?.getEmbedUrl?.(contentId);
}

/**
 * Get canonical URL for content by type and ID.
 */
export function getCanonicalUrl(type: string, contentId: string): string {
    const provider = getProvider(type);
    return provider?.getCanonicalUrl(contentId) || contentId;
}

// Re-export types and providers
export * from './base';
export {
    youtubeProvider,
    twitterProvider,
    instagramProvider,
    githubProvider,
    mediumProvider,
    notionProvider,
    genericProvider
};
