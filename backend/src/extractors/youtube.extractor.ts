/**
 * YouTube Content Extractor
 *
 * Uses YouTube Data API v3 for metadata and youtube-transcript for captions.
 * Stores both timestamped segments and concatenated plain text.
 */

import { ContentExtractor, ExtractedMetadata } from './base';
import { config } from '../config';
import { safeFetchJson } from './safe-fetch';
import { logger } from '../logger';

const EXTRACTOR_VERSION = '1.0.0';

export const youtubeExtractor: ContentExtractor = {
    type: 'youtube',
    displayName: 'YouTube',

    isConfigured(): boolean {
        return !!config.apiKeys.youtubeApiKey;
    },

    async extract(url: string, contentId: string): Promise<ExtractedMetadata> {
        const apiKey = config.apiKeys.youtubeApiKey;
        const metadata: ExtractedMetadata = {
            extractedAt: new Date(),
            extractorVersion: EXTRACTOR_VERSION,
        };

        // Fetch video details from YouTube Data API v3
        const parts = 'snippet,contentDetails,statistics,topicDetails,status';
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${encodeURIComponent(contentId)}&part=${encodeURIComponent(parts)}&key=${encodeURIComponent(apiKey)}`;

        const { response, data } = await safeFetchJson(apiUrl, { skipSsrfCheck: true });
        if (!response.ok) {
            throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
        }
        const video = data.items?.[0];

        if (!video) {
            throw new Error(`YouTube video not found: ${contentId}`);
        }

        const snippet = video.snippet || {};
        const contentDetails = video.contentDetails || {};
        const statistics = video.statistics || {};
        const topicDetails = video.topicDetails || {};
        const status = video.status || {};

        // Common fields
        metadata.title = snippet.title;
        metadata.description = snippet.description;
        metadata.author = snippet.channelTitle;
        metadata.authorUrl = `https://www.youtube.com/channel/${snippet.channelId}`;
        metadata.thumbnailUrl = snippet.thumbnails?.high?.url
            || snippet.thumbnails?.medium?.url
            || snippet.thumbnails?.default?.url;
        metadata.publishedDate = snippet.publishedAt;
        metadata.tags = snippet.tags || [];
        metadata.language = snippet.defaultAudioLanguage || snippet.defaultLanguage;

        // Provider-specific data
        metadata.providerData = {
            channelId: snippet.channelId,
            categoryId: snippet.categoryId,
            duration: contentDetails.duration,
            definition: contentDetails.definition,
            captionAvailable: contentDetails.caption === 'true',
            viewCount: statistics.viewCount,
            likeCount: statistics.likeCount,
            commentCount: statistics.commentCount,
            topicCategories: topicDetails.topicCategories || [],
            liveBroadcastContent: snippet.liveBroadcastContent,
            license: status.license,
            embeddable: status.embeddable,
        };

        // Fetch transcript (no API key needed)
        try {
            const { YoutubeTranscript } = await import('youtube-transcript');
            const segments = await YoutubeTranscript.fetchTranscript(contentId);

            metadata.transcriptSegments = segments.map(s => ({
                text: s.text,
                start: s.offset / 1000,  // Convert ms to seconds
                duration: s.duration / 1000,
            }));

            metadata.fullText = segments.map(s => s.text).join(' ');
            metadata.fullTextType = 'transcript';
        } catch (err) {
            // Transcript not available — not a fatal error
            logger.warn({ contentId, err }, 'YouTube transcript unavailable');
        }

        return metadata;
    }
};
