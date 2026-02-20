/**
 * YouTube Content Extractor
 *
 * Uses YouTube Data API v3 for metadata and scrapes YouTube captions directly.
 * Stores both timestamped segments and concatenated plain text.
 */

import { ContentExtractor, ExtractedMetadata } from './base';
import { config } from '../config';
import { safeFetchJson } from './safe-fetch';
import { logger } from '../logger';

interface TranscriptSegment {
    text: string;
    start: number;
    duration: number;
}

interface CaptionTrack {
    baseUrl: string;
    languageCode: string;
    kind?: string;
}

const INNERTUBE_CONTEXT = {
    client: { clientName: 'ANDROID', clientVersion: '20.10.38' },
};

/**
 * Decode common HTML entities in transcript text.
 */
function decodeHtmlEntities(text: string): string {
    return text
        .replace(/<[^>]+>/g, '')
        .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) => String.fromCharCode(parseInt(n, 16)))
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");
}

/**
 * Fetches transcript segments from YouTube using the Innertube player API
 * (same approach as the Python youtube-transcript-api library).
 *
 * 1. Fetch the watch page to extract the INNERTUBE_API_KEY.
 * 2. Call /youtubei/v1/player with ANDROID client context to get caption tracks.
 * 3. Fetch the caption XML from the track URL and parse it.
 */
async function fetchTranscript(videoId: string, lang?: string): Promise<TranscriptSegment[]> {
    // Step 1: Get Innertube API key from the watch page
    const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!watchRes.ok) {
        throw new Error(`Failed to fetch YouTube page: ${watchRes.status}`);
    }

    const html = await watchRes.text();

    if (html.includes('class="g-recaptcha"')) {
        throw new Error('YouTube is requiring CAPTCHA verification');
    }

    const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/);
    if (!apiKeyMatch) {
        throw new Error('Could not extract Innertube API key');
    }

    // Handle consent cookie if needed
    // (for EU regions YouTube may show a consent wall)
    const cookies = watchRes.headers.getSetCookie?.() || [];
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');

    // Step 2: Call Innertube player API to get caption tracks
    const playerRes = await fetch(
        `https://www.youtube.com/youtubei/v1/player?key=${apiKeyMatch[1]}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(cookieHeader && { 'Cookie': cookieHeader }),
            },
            body: JSON.stringify({
                context: INNERTUBE_CONTEXT,
                videoId,
            }),
        }
    );

    if (!playerRes.ok) {
        throw new Error(`Innertube player API error: ${playerRes.status}`);
    }

    const playerData = await playerRes.json() as any;

    const playabilityStatus = playerData.playabilityStatus?.status;
    if (playabilityStatus && playabilityStatus !== 'OK') {
        throw new Error(`Video not playable: ${playabilityStatus} - ${playerData.playabilityStatus?.reason || 'unknown'}`);
    }

    const captionTracks: CaptionTrack[] =
        playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captionTracks?.length) {
        throw new Error(`No transcript available for video: ${videoId}`);
    }

    // Pick the best track: prefer manually created, then match language
    const manualTracks = captionTracks.filter(t => t.kind !== 'asr');
    const autoTracks = captionTracks.filter(t => t.kind === 'asr');

    let track: CaptionTrack | undefined;
    if (lang) {
        track = manualTracks.find(t => t.languageCode === lang)
            || autoTracks.find(t => t.languageCode === lang);
    }
    if (!track) {
        track = manualTracks[0] || autoTracks[0];
    }

    // Remove &fmt=srv3 if present (we want the default XML format)
    let captionUrl = track.baseUrl.replace('&fmt=srv3', '');

    // Check for PoToken requirement
    if (captionUrl.includes('&exp=xpe')) {
        throw new Error('YouTube requires PoToken for this video\'s captions');
    }

    // Step 3: Fetch and parse the caption XML
    const captionRes = await fetch(captionUrl);
    if (!captionRes.ok) {
        throw new Error(`Failed to fetch caption track: ${captionRes.status}`);
    }

    const xml = await captionRes.text();

    // Parse <text start="..." dur="...">content</text>
    const regex = /<text start="([^"]*)" dur="([^"]*)"[^>]*>([\s\S]*?)<\/text>/g;
    const segments: TranscriptSegment[] = [];

    let match;
    while ((match = regex.exec(xml)) !== null) {
        const text = decodeHtmlEntities(match[3]);
        if (!text) continue;

        segments.push({
            text,
            start: parseFloat(match[1]),
            duration: parseFloat(match[2]) || 0,
        });
    }

    return segments;
}

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

        // Fetch transcript (no API key needed — scrapes YouTube directly)
        try {
            const segments = await fetchTranscript(contentId, metadata.language);

            if (segments.length > 0) {
                metadata.transcriptSegments = segments.map(s => ({
                    text: s.text,
                    start: s.start,
                    duration: s.duration,
                }));

                metadata.fullText = segments.map(s => s.text).join(' ');
                metadata.fullTextType = 'transcript';
            }
        } catch (err) {
            // Transcript not available — not a fatal error
            logger.warn({ contentId, err }, 'YouTube transcript unavailable');
        }

        return metadata;
    }
};
