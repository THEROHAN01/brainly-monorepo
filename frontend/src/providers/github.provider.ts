/**
 * GitHub Content Provider (Frontend)
 *
 * Handles GitHub URL formats:
 * - Repos: github.com/{owner}/{repo}
 * - Issues: github.com/{owner}/{repo}/issues/{number}
 * - Pull Requests: github.com/{owner}/{repo}/pull/{number}
 * - Gists: gist.github.com/{user}/{gistId}
 */

import type { ContentProvider } from './base';

const GITHUB_HOSTNAMES = [
    'github.com',
    'www.github.com',
    'gist.github.com',
];

const NON_REPO_PAGES = [
    'settings', 'marketplace', 'explore', 'topics',
    'trending', 'collections', 'events', 'sponsors',
    'login', 'signup', 'features', 'pricing', 'enterprise',
];

export const githubProvider: ContentProvider = {
    type: 'github',
    displayName: 'GitHub',
    hostnames: GITHUB_HOSTNAMES,
    supportsEmbed: false,
    embedType: 'card',

    canHandle(url: URL): boolean {
        const hostname = url.hostname.toLowerCase();
        return this.hostnames.includes(hostname);
    },

    extractId(url: URL): string | null {
        const hostname = url.hostname.toLowerCase();
        const pathParts = url.pathname.split('/').filter(Boolean);

        if (hostname === 'gist.github.com') {
            if (pathParts.length >= 2) {
                return `gist/${pathParts[0]}/${pathParts[1]}`;
            }
            return null;
        }

        if (pathParts.length < 2) return null;

        const owner = pathParts[0];
        const repo = pathParts[1];

        if (NON_REPO_PAGES.includes(owner)) return null;

        if (pathParts.length >= 4 && ['issues', 'pull', 'discussions'].includes(pathParts[2])) {
            const number = pathParts[3];
            if (/^\d+$/.test(number)) {
                return `${owner}/${repo}/${pathParts[2]}/${number}`;
            }
        }

        return `${owner}/${repo}`;
    },

    getCanonicalUrl(contentId: string): string {
        if (contentId.startsWith('gist/')) {
            return `https://gist.github.com/${contentId.slice(5)}`;
        }
        return `https://github.com/${contentId}`;
    }
};
