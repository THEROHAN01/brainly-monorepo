/**
 * Generic Content Extractor (Fallback)
 *
 * Uses @extractus/article-extractor for any URL.
 * Falls back to OG meta tag scraping if article extraction fails.
 * Handles the 'link' type and any unmatched provider types.
 */

import { ContentExtractor, ExtractedMetadata } from './base';
import { safeFetchText } from './safe-fetch';
import { stripHtml } from './html-utils';

const EXTRACTOR_VERSION = '1.0.0';

export const genericExtractor: ContentExtractor = {
    type: 'link',
    displayName: 'Generic Link',

    isConfigured(): boolean {
        return true; // No key needed
    },

    async extract(url: string, contentId: string): Promise<ExtractedMetadata> {
        const metadata: ExtractedMetadata = {
            extractedAt: new Date(),
            extractorVersion: EXTRACTOR_VERSION,
        };

        // Try article extraction first
        try {
            const { extract } = await import('@extractus/article-extractor');
            const article = await extract(url);

            if (article) {
                metadata.title = article.title;
                metadata.description = article.description;
                metadata.author = article.author;
                metadata.thumbnailUrl = article.image;
                metadata.publishedDate = article.published;

                if (article.content) {
                    metadata.fullText = stripHtml(article.content);
                    metadata.fullTextType = 'article';
                }

                metadata.providerData = {
                    source: article.source,
                    ttr: article.ttr,
                    favicon: article.favicon,
                    type: article.type,
                };

                return metadata;
            }
        } catch {
            // Article extraction failed — fall through to OG scraping
        }

        // Fallback: OG meta tag scraping (SSRF check applied — user-supplied URL)
        try {
            const { response, text: html } = await safeFetchText(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; Brainly/1.0)',
                    'Accept': 'text/html',
                },
            });

            if (response.ok) {
                metadata.title = extractMeta(html, 'og:title') || extractTag(html, 'title');
                metadata.description = extractMeta(html, 'og:description') || extractMeta(html, 'description');
                metadata.thumbnailUrl = extractMeta(html, 'og:image');
                metadata.author = extractMeta(html, 'author');

                metadata.providerData = {
                    siteName: extractMeta(html, 'og:site_name'),
                    type: extractMeta(html, 'og:type'),
                };
            }
        } catch {
            // Even OG scraping failed — return minimal metadata
        }

        return metadata;
    }
};

function extractMeta(html: string, property: string): string | undefined {
    // Try property attribute
    const propRegex = new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
    const propMatch = html.match(propRegex);
    if (propMatch) return propMatch[1];

    // Try name attribute (for non-OG metas like "author", "description")
    const nameRegex = new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
    const nameMatch = html.match(nameRegex);
    if (nameMatch) return nameMatch[1];

    // Try reversed order
    const revRegex = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`, 'i');
    const revMatch = html.match(revRegex);
    return revMatch?.[1];
}

function extractTag(html: string, tagName: string): string | undefined {
    const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i');
    const match = html.match(regex);
    return match?.[1]?.trim();
}

