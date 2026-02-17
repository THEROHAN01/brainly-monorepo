/**
 * GitHub Content Extractor
 *
 * Uses GitHub REST API to extract repo, issue, PR, and gist data.
 * Works unauthenticated (60 req/hr) or with token (5,000 req/hr).
 */

import { ContentExtractor, ExtractedMetadata } from './base';
import { config } from '../config';
import { safeFetchJson } from './safe-fetch';

const EXTRACTOR_VERSION = '1.0.0';
const GITHUB_API = 'https://api.github.com';

export const githubExtractor: ContentExtractor = {
    type: 'github',
    displayName: 'GitHub',

    isConfigured(): boolean {
        return true; // Works without token (lower rate limit)
    },

    async extract(url: string, contentId: string): Promise<ExtractedMetadata> {
        const metadata: ExtractedMetadata = {
            extractedAt: new Date(),
            extractorVersion: EXTRACTOR_VERSION,
        };

        const headers: Record<string, string> = {
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'Brainly/1.0',
        };
        if (config.apiKeys.githubToken) {
            headers['Authorization'] = `Bearer ${config.apiKeys.githubToken}`;
        }

        // Determine resource type from contentId format
        if (contentId.startsWith('gist/')) {
            await extractGist(contentId.slice(5), headers, metadata);
        } else if (contentId.includes('/issues/') || contentId.includes('/pull/') || contentId.includes('/discussions/')) {
            await extractIssueOrPR(contentId, headers, metadata);
        } else {
            await extractRepo(contentId, headers, metadata);
        }

        return metadata;
    }
};

async function extractRepo(repoPath: string, headers: Record<string, string>, metadata: ExtractedMetadata) {
    // Fetch repo info
    const { response, data: repo } = await safeFetchJson(`${GITHUB_API}/repos/${repoPath}`, {
        headers,
        skipSsrfCheck: true,
    });
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

    metadata.title = repo.full_name;
    metadata.description = repo.description;
    metadata.author = repo.owner?.login;
    metadata.authorUrl = repo.owner?.html_url;
    metadata.publishedDate = repo.created_at;
    metadata.tags = repo.topics || [];
    metadata.language = repo.language;

    metadata.providerData = {
        resourceType: 'repository',
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        license: repo.license?.name,
        defaultBranch: repo.default_branch,
        archived: repo.archived,
        updatedAt: repo.updated_at,
    };

    // Fetch README for full text (critical for RAG)
    try {
        const { response: readmeRes, data: readmeData } = await safeFetchJson(
            `${GITHUB_API}/repos/${repoPath}/readme`,
            { headers, skipSsrfCheck: true }
        );
        if (readmeRes.ok && readmeData.content && readmeData.encoding === 'base64') {
            metadata.fullText = Buffer.from(readmeData.content, 'base64').toString('utf-8');
            metadata.fullTextType = 'markdown';
        }
    } catch {
        // README not available
    }
}

async function extractIssueOrPR(path: string, headers: Record<string, string>, metadata: ExtractedMetadata) {
    // path format: owner/repo/issues/123 or owner/repo/pull/456
    const parts = path.split('/');
    const owner = parts[0];
    const repo = parts[1];
    const type = parts[2]; // 'issues', 'pull', 'discussions'
    const number = parts[3];

    // GitHub API uses 'pulls' not 'pull'
    const apiType = type === 'pull' ? 'pulls' : type;
    const { response, data: item } = await safeFetchJson(
        `${GITHUB_API}/repos/${owner}/${repo}/${apiType}/${number}`,
        { headers, skipSsrfCheck: true }
    );
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

    metadata.title = item.title;
    metadata.description = item.body?.slice(0, 500);
    metadata.author = item.user?.login;
    metadata.authorUrl = item.user?.html_url;
    metadata.publishedDate = item.created_at;
    metadata.tags = (item.labels || []).map((l: any) => l.name);

    // Full body is the most valuable for RAG
    metadata.fullText = item.body || '';
    metadata.fullTextType = 'markdown';

    metadata.providerData = {
        resourceType: type === 'pull' ? 'pull_request' : type.replace(/s$/, ''),
        state: item.state,
        comments: item.comments,
        ...(type === 'pull' ? {
            additions: item.additions,
            deletions: item.deletions,
            changedFiles: item.changed_files,
            merged: item.merged,
        } : {}),
    };
}

async function extractGist(gistPath: string, headers: Record<string, string>, metadata: ExtractedMetadata) {
    // gistPath format: user/gistId
    const gistId = gistPath.split('/')[1];
    const { response, data: gist } = await safeFetchJson(`${GITHUB_API}/gists/${gistId}`, {
        headers,
        skipSsrfCheck: true,
    });
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

    metadata.title = gist.description || `Gist by ${gist.owner?.login}`;
    metadata.description = gist.description;
    metadata.author = gist.owner?.login;
    metadata.authorUrl = gist.owner?.html_url;
    metadata.publishedDate = gist.created_at;

    // Concatenate all gist file contents for RAG
    const files = Object.values(gist.files || {}) as any[];
    const fileContents = files
        .filter((f: any) => f.content && !f.truncated)
        .map((f: any) => `### ${f.filename}\n\`\`\`${f.language || ''}\n${f.content}\n\`\`\``)
        .join('\n\n');

    if (fileContents) {
        metadata.fullText = fileContents;
        metadata.fullTextType = 'markdown';
    }

    metadata.providerData = {
        resourceType: 'gist',
        public: gist.public,
        files: files.map((f: any) => ({
            filename: f.filename,
            language: f.language,
            size: f.size,
        })),
    };
}
