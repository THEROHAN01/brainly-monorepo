/**
 * Twitter/X Content Extractor
 *
 * Uses Twitter oEmbed API (free, no key required) to extract
 * tweet text, author name, and embed HTML.
 */

import { ContentExtractor, ExtractedMetadata } from './base';
import { safeFetchJson } from './safe-fetch';

const EXTRACTOR_VERSION = '1.0.0';
const OEMBED_URL = 'https://publish.twitter.com/oembed';

export const twitterExtractor: ContentExtractor = {
    type: 'twitter',
    displayName: 'Twitter',

    isConfigured(): boolean {
        return true; // oEmbed is free, no key needed
    },

    async extract(url: string, contentId: string): Promise<ExtractedMetadata> {
        const metadata: ExtractedMetadata = {
            extractedAt: new Date(),
            extractorVersion: EXTRACTOR_VERSION,
        };

        // Use the canonical URL for oEmbed
        const tweetUrl = `https://twitter.com/i/status/${contentId}`;
        const oembedUrl = `${OEMBED_URL}?url=${encodeURIComponent(tweetUrl)}&format=json`;

        const { response, data } = await safeFetchJson(oembedUrl, { skipSsrfCheck: true });
        if (!response.ok) {
            throw new Error(`Twitter oEmbed error: ${response.status} ${response.statusText}`);
        }

        metadata.author = data.author_name;
        metadata.authorUrl = data.author_url;

        // Extract tweet text from the embed HTML
        // oEmbed html contains a <p> with the tweet text
        const htmlContent = data.html || '';
        const textMatch = htmlContent.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
        if (textMatch) {
            // Strip HTML tags from the extracted text
            const tweetText = textMatch[1]
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
                .replace(/<[^>]+>/g, '')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .trim();

            metadata.fullText = tweetText;
            metadata.fullTextType = 'plain';
        }

        metadata.providerData = {
            embedHtml: htmlContent,
            oembedUrl: data.url,
        };

        return metadata;
    }
};
