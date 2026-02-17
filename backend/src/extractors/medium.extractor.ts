/**
 * Medium Content Extractor
 *
 * Uses @extractus/article-extractor to extract article content.
 * No API key required — works by fetching and parsing the HTML.
 */

import { ContentExtractor, ExtractedMetadata } from './base';
import { stripHtml } from './html-utils';

const EXTRACTOR_VERSION = '1.0.0';

export const mediumExtractor: ContentExtractor = {
    type: 'medium',
    displayName: 'Medium',

    isConfigured(): boolean {
        return true; // No key needed
    },

    async extract(url: string, contentId: string): Promise<ExtractedMetadata> {
        const metadata: ExtractedMetadata = {
            extractedAt: new Date(),
            extractorVersion: EXTRACTOR_VERSION,
        };

        const canonicalUrl = `https://medium.com/p/${contentId}`;

        // Dynamic import because article-extractor is ESM-only
        const { extract } = await import('@extractus/article-extractor');
        const article = await extract(canonicalUrl);

        if (!article) {
            throw new Error(`Failed to extract Medium article: ${contentId}`);
        }

        metadata.title = article.title;
        metadata.description = article.description;
        metadata.author = article.author;
        metadata.thumbnailUrl = article.image;
        metadata.publishedDate = article.published;

        // Strip HTML tags from content for plain text RAG
        if (article.content) {
            metadata.fullText = stripHtml(article.content);
            metadata.fullTextType = 'article';
        }

        metadata.providerData = {
            source: article.source,
            ttr: article.ttr, // time to read in seconds
            favicon: article.favicon,
            type: article.type,
        };

        return metadata;
    }
};
