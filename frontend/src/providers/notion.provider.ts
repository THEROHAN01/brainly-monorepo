/**
 * Notion Content Provider (Frontend)
 *
 * Handles Notion URL formats:
 * - Pages: notion.so/{workspace}/{page-title}-{pageId}
 * - Direct: notion.so/{pageId}
 * - Custom domains: {workspace}.notion.site/{page-title}-{pageId}
 */

import type { ContentProvider } from './base';

const NOTION_HOSTNAMES = [
    'notion.so',
    'www.notion.so',
    'notion.site',
];

export const notionProvider: ContentProvider = {
    type: 'notion',
    displayName: 'Notion',
    hostnames: NOTION_HOSTNAMES,
    supportsEmbed: false,
    embedType: 'card',

    canHandle(url: URL): boolean {
        const hostname = url.hostname.toLowerCase();
        return this.hostnames.includes(hostname) || hostname.endsWith('.notion.site');
    },

    extractId(url: URL): string | null {
        const segments = url.pathname.split('/').filter(Boolean);
        if (segments.length === 0) return null;

        const lastSegment = segments[segments.length - 1];

        const idMatch = lastSegment.match(/([a-f0-9]{32})$/i);
        if (idMatch) {
            return idMatch[1];
        }

        const uuidMatch = lastSegment.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
        if (uuidMatch) {
            return uuidMatch[1].replace(/-/g, '');
        }

        return null;
    },

    getCanonicalUrl(contentId: string): string {
        const formatted = `${contentId.slice(0, 8)}-${contentId.slice(8, 12)}-${contentId.slice(12, 16)}-${contentId.slice(16, 20)}-${contentId.slice(20)}`;
        return `https://notion.so/${formatted}`;
    }
};
