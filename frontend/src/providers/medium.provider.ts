/**
 * Medium Content Provider (Frontend)
 *
 * Handles Medium URL formats:
 * - Articles: medium.com/@{author}/{slug}-{articleId}
 * - Publications: medium.com/{publication}/{slug}-{articleId}
 * - Custom subdomains: {publication}.medium.com/{slug}-{articleId}
 * - Short links: medium.com/p/{articleId}
 */

import type { ContentProvider } from './base';

const MEDIUM_ID_REGEX = /^[a-f0-9]{10,12}$/i;

const MEDIUM_HOSTNAMES = [
    'medium.com',
    'www.medium.com',
];

export const mediumProvider: ContentProvider = {
    type: 'medium',
    displayName: 'Medium',
    hostnames: MEDIUM_HOSTNAMES,
    supportsEmbed: false,
    embedType: 'card',

    canHandle(url: URL): boolean {
        const hostname = url.hostname.toLowerCase();
        return this.hostnames.includes(hostname) || hostname.endsWith('.medium.com');
    },

    extractId(url: URL): string | null {
        const pathParts = url.pathname.split('/').filter(Boolean);

        if (pathParts.length >= 2 && pathParts[0] === 'p') {
            const id = pathParts[1];
            if (MEDIUM_ID_REGEX.test(id)) {
                return id;
            }
        }

        if (pathParts.length >= 1) {
            const lastSegment = pathParts[pathParts.length - 1];
            const idMatch = lastSegment.match(/-([a-f0-9]{10,12})$/i);
            if (idMatch) {
                return idMatch[1];
            }
            if (MEDIUM_ID_REGEX.test(lastSegment)) {
                return lastSegment;
            }
        }

        return null;
    },

    getCanonicalUrl(contentId: string): string {
        return `https://medium.com/p/${contentId}`;
    }
};
