/**
 * Base types for the content extraction system.
 *
 * Extractors fetch rich metadata from provider APIs
 * (YouTube Data API, GitHub API, article scrapers, etc.)
 * to enrich stored content for RAG and search.
 */

/**
 * Structured metadata extracted from a content URL.
 * Common fields are typed explicitly for easy Postgres migration later.
 * Provider-specific data goes in `providerData`.
 */
export interface ExtractedMetadata {
    // Common fields across all providers
    title?: string;
    description?: string;
    author?: string;
    authorUrl?: string;
    thumbnailUrl?: string;
    publishedDate?: string;
    tags?: string[];
    language?: string;

    // Full text content for RAG
    fullText?: string;
    fullTextType?: 'transcript' | 'article' | 'markdown' | 'plain';

    // Timestamped transcript segments (YouTube)
    transcriptSegments?: Array<{ text: string; start: number; duration: number }>;

    // Provider-specific structured data
    providerData?: Record<string, any>;

    // Extraction metadata
    extractedAt: Date;
    extractorVersion: string;
}

/**
 * Interface all content extractors must implement.
 *
 * Each extractor handles one provider type and knows how to:
 * 1. Check if it has the required API keys configured
 * 2. Fetch and parse metadata from the provider's API
 */
export interface ContentExtractor {
    /** Provider type this extractor handles (matches provider.type) */
    type: string;

    /** Display name for logging */
    displayName: string;

    /**
     * Check if this extractor has the required API keys/config.
     * If false, enrichment will be skipped for this type.
     */
    isConfigured(): boolean;

    /**
     * Extract metadata from the given URL/contentId.
     *
     * @param url - The original URL saved by the user
     * @param contentId - The extracted content ID from the provider
     * @returns Extracted metadata or throws on failure
     */
    extract(url: string, contentId: string): Promise<ExtractedMetadata>;
}
