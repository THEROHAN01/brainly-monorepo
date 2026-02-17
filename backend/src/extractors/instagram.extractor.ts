/**
 * Instagram Content Extractor
 *
 * Extracts metadata from Instagram posts via OG meta tags.
 * Falls back gracefully since Instagram limits API access.
 */

import { ContentExtractor, ExtractedMetadata } from './base';
import { safeFetchText } from './safe-fetch';

const EXTRACTOR_VERSION = '1.0.0';

export const instagramExtractor: ContentExtractor = {
    type: 'instagram',
    displayName: 'Instagram',

    isConfigured(): boolean {
        return true; // Works via meta tag scraping, no key required
    },

    async extract(url: string, contentId: string): Promise<ExtractedMetadata> {
        const metadata: ExtractedMetadata = {
            extractedAt: new Date(),
            extractorVersion: EXTRACTOR_VERSION,
        };

        const canonicalUrl = `https://www.instagram.com/p/${contentId}/`;

        const { response, text: html } = await safeFetchText(canonicalUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Brainly/1.0)',
                'Accept': 'text/html',
            },
            skipSsrfCheck: true, // Known host
        });

        if (!response.ok) {
            throw new Error(`Instagram fetch error: ${response.status}`);
        }

        // Extract OG meta tags
        metadata.title = extractMeta(html, 'og:title');
        metadata.description = extractMeta(html, 'og:description');
        metadata.thumbnailUrl = extractMeta(html, 'og:image');

        // Try to extract caption from description
        const description = metadata.description || '';
        if (description) {
            metadata.fullText = description;
            metadata.fullTextType = 'plain';

            // Extract hashtags from caption
            const hashtags = description.match(/#[a-zA-Z0-9_]+/g);
            if (hashtags) {
                metadata.tags = hashtags.map(h => h.slice(1)); // Remove # prefix
            }
        }

        // Extract author from title (format: "Author on Instagram: ...")
        const authorMatch = metadata.title?.match(/^(.+?)\s+on\s+Instagram/i);
        if (authorMatch) {
            metadata.author = authorMatch[1];
        }

        metadata.providerData = {
            mediaType: extractMeta(html, 'og:type'),
            siteName: extractMeta(html, 'og:site_name'),
        };

        // If we got no meaningful data, throw so enrichment marks it as failed
        const hasData = metadata.title || metadata.description || metadata.fullText;
        if (!hasData) {
            throw new Error(`Instagram extraction yielded no data for ${contentId} — likely blocked`);
        }

        return metadata;
    }
};

function extractMeta(html: string, property: string): string | undefined {
    const regex = new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
    const match = html.match(regex);
    if (match) return match[1];

    // Try reversed order (content before property)
    const regex2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i');
    const match2 = html.match(regex2);
    return match2?.[1];
}
