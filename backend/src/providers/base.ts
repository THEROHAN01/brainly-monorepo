/**
 * Base types and interfaces for the content provider system.
 *
 * This module defines the contract that all content providers must implement.
 * The provider pattern allows easy extension to support new content types
 * (YouTube, Twitter, Notion, Spotify, etc.) without modifying core logic.
 */

/**
 * Embed type determines how content is rendered in the frontend
 * - 'iframe': Direct iframe embedding (YouTube, Spotify)
 * - 'oembed': Uses oEmbed/widget API (Twitter)
 * - 'card': Link preview card with metadata
 * - 'none': No visual embed, just stored as reference
 */
export type EmbedType = 'iframe' | 'oembed' | 'card' | 'none';

/**
 * Content provider interface - all providers must implement this contract.
 *
 * Each provider handles a specific content type (e.g., YouTube videos,
 * Twitter posts) and knows how to:
 * 1. Detect if a URL belongs to its platform
 * 2. Extract a unique content ID from the URL
 * 3. Generate embed and canonical URLs from the ID
 */
export interface ContentProvider {
    /**
     * Unique identifier for this content type.
     * Used in database storage and API responses.
     * Examples: 'youtube', 'twitter', 'notion', 'spotify', 'link'
     */
    type: string;

    /**
     * Human-readable display name for UI.
     * Examples: 'YouTube', 'Twitter', 'Notion', 'Spotify', 'Link'
     */
    displayName: string;

    /**
     * List of hostnames this provider handles.
     * Used for quick hostname-based filtering before detailed parsing.
     * Examples: ['youtube.com', 'www.youtube.com', 'youtu.be']
     */
    hostnames: string[];

    /**
     * Whether this content type supports visual embedding.
     * If false, content will be displayed as a link card.
     */
    supportsEmbed: boolean;

    /**
     * Type of embed rendering to use in frontend.
     */
    embedType: EmbedType;

    /**
     * Check if this provider can handle the given URL.
     * This is the first filter - providers are tried in order until one matches.
     *
     * @param url - Parsed URL object to check
     * @returns true if this provider should attempt to parse the URL
     */
    canHandle(url: URL): boolean;

    /**
     * Extract the unique content identifier from the URL.
     *
     * For YouTube: video ID (e.g., 'dQw4w9WgXcQ')
     * For Twitter: tweet ID (e.g., '1234567890123456789')
     * For generic links: URL hash
     *
     * @param url - Parsed URL object to extract ID from
     * @returns Content ID string, or null if extraction fails
     */
    extractId(url: URL): string | null;

    /**
     * Generate the embed URL for this content.
     * Only required if supportsEmbed is true.
     *
     * @param contentId - The extracted content ID
     * @returns Embeddable URL string
     */
    getEmbedUrl?(contentId: string): string;

    /**
     * Generate the canonical URL for this content.
     * This is the "clean" URL users see when sharing.
     *
     * @param contentId - The extracted content ID
     * @returns Canonical URL string
     */
    getCanonicalUrl(contentId: string): string;
}

/**
 * Result of parsing a URL through the provider system.
 * Contains all information needed to store and display the content.
 */
export interface ParsedContent {
    /**
     * Provider type that matched (e.g., 'youtube', 'twitter', 'link')
     */
    type: string;

    /**
     * Display name for the content type
     */
    displayName: string;

    /**
     * Extracted content ID
     */
    contentId: string;

    /**
     * Original URL as submitted by user
     */
    originalUrl: string;

    /**
     * Embed URL if available (for iframe/oembed types)
     */
    embedUrl?: string;

    /**
     * Canonical URL for sharing/linking
     */
    canonicalUrl: string;

    /**
     * Whether this content can be embedded
     */
    canEmbed: boolean;

    /**
     * Type of embed rendering to use
     */
    embedType: EmbedType;
}

/**
 * Validation result returned by the validate endpoint.
 * Used for preview functionality before saving content.
 */
export interface ValidationResult {
    /**
     * Whether the URL is valid and recognized
     */
    valid: boolean;

    /**
     * Error message if validation failed
     */
    message?: string;

    /**
     * Provider type if valid
     */
    type?: string;

    /**
     * Display name if valid
     */
    displayName?: string;

    /**
     * Extracted content ID if valid
     */
    contentId?: string;

    /**
     * Embed URL if available
     */
    embedUrl?: string;

    /**
     * Whether embedding is supported
     */
    canEmbed?: boolean;

    /**
     * Embed type for frontend rendering
     */
    embedType?: EmbedType;
}
