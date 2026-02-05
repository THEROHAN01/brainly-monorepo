/**
 * Base types and interfaces for the content provider system.
 *
 * This module defines the contract that all content providers must implement.
 * The provider pattern allows easy extension to support new content types
 * (YouTube, Twitter, Notion, Spotify, etc.) without modifying core logic.
 */

/**
 * Embed type determines how content is rendered
 * - 'iframe': Direct iframe embedding (YouTube, Spotify)
 * - 'oembed': Uses oEmbed/widget API (Twitter)
 * - 'card': Link preview card with metadata
 * - 'none': No visual embed, just stored as reference
 */
export type EmbedType = 'iframe' | 'oembed' | 'card' | 'none';

/**
 * Content provider interface - all providers must implement this contract.
 */
export interface ContentProvider {
    /** Unique identifier for this content type (e.g., 'youtube', 'twitter') */
    type: string;

    /** Human-readable display name for UI */
    displayName: string;

    /** List of hostnames this provider handles */
    hostnames: string[];

    /** Whether this content type supports visual embedding */
    supportsEmbed: boolean;

    /** Type of embed rendering to use */
    embedType: EmbedType;

    /** Check if this provider can handle the given URL */
    canHandle(url: URL): boolean;

    /** Extract the unique content identifier from the URL */
    extractId(url: URL): string | null;

    /** Generate the embed URL for this content (optional) */
    getEmbedUrl?(contentId: string): string;

    /** Generate the canonical URL for this content */
    getCanonicalUrl(contentId: string): string;
}

/**
 * Result of parsing a URL through the provider system.
 */
export interface ParsedContent {
    /** Provider type that matched */
    type: string;

    /** Display name for the content type */
    displayName: string;

    /** Extracted content ID */
    contentId: string;

    /** Original URL as submitted */
    originalUrl: string;

    /** Embed URL if available */
    embedUrl?: string;

    /** Canonical URL for sharing/linking */
    canonicalUrl: string;

    /** Whether this content can be embedded */
    canEmbed: boolean;

    /** Type of embed rendering to use */
    embedType: EmbedType;
}

/**
 * Validation result for URL preview.
 */
export interface ValidationResult {
    /** Whether the URL is valid and recognized */
    valid: boolean;

    /** Error message if validation failed */
    message?: string;

    /** Provider type if valid */
    type?: string;

    /** Display name if valid */
    displayName?: string;

    /** Extracted content ID if valid */
    contentId?: string;

    /** Embed URL if available */
    embedUrl?: string;

    /** Whether embedding is supported */
    canEmbed?: boolean;

    /** Embed type for rendering */
    embedType?: EmbedType;
}
