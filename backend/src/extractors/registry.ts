/**
 * Extractor Registry
 *
 * Maps provider types to their corresponding content extractors.
 * Similar pattern to the provider registry but for data extraction.
 */

import { ContentExtractor } from './base';
import { youtubeExtractor } from './youtube.extractor';
import { twitterExtractor } from './twitter.extractor';
import { instagramExtractor } from './instagram.extractor';
import { githubExtractor } from './github.extractor';
import { mediumExtractor } from './medium.extractor';
import { genericExtractor } from './generic.extractor';

const extractors: ContentExtractor[] = [
    youtubeExtractor,
    twitterExtractor,
    instagramExtractor,
    githubExtractor,
    mediumExtractor,
    genericExtractor, // Fallback — handles 'link' type and any unmatched type
];

/**
 * Get the extractor for a given content type.
 * Falls back to generic extractor if no specific one is found.
 */
export function getExtractor(type: string): ContentExtractor {
    return extractors.find(e => e.type === type) || genericExtractor;
}

/**
 * Check if a given type has a configured extractor.
 */
export function isExtractorConfigured(type: string): boolean {
    const extractor = getExtractor(type);
    return extractor.isConfigured();
}
