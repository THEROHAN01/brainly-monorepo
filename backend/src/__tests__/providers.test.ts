import { describe, it, expect } from 'vitest';
import { parseUrl, isValidUrl } from '../providers';

describe('parseUrl', () => {
    describe('YouTube', () => {
        it('parses standard watch URL', () => {
            const result = parseUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            expect(result).not.toBeNull();
            expect(result!.type).toBe('youtube');
            expect(result!.contentId).toBe('dQw4w9WgXcQ');
            expect(result!.canEmbed).toBe(true);
        });

        it('parses short URL (youtu.be)', () => {
            const result = parseUrl('https://youtu.be/dQw4w9WgXcQ');
            expect(result!.type).toBe('youtube');
            expect(result!.contentId).toBe('dQw4w9WgXcQ');
        });

        it('parses shorts URL', () => {
            const result = parseUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ');
            expect(result!.type).toBe('youtube');
            expect(result!.contentId).toBe('dQw4w9WgXcQ');
        });

        it('parses embed URL', () => {
            const result = parseUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
            expect(result!.type).toBe('youtube');
            expect(result!.contentId).toBe('dQw4w9WgXcQ');
        });

        it('parses live URL', () => {
            const result = parseUrl('https://www.youtube.com/live/dQw4w9WgXcQ');
            expect(result!.type).toBe('youtube');
            expect(result!.contentId).toBe('dQw4w9WgXcQ');
        });

        it('parses mobile URL', () => {
            const result = parseUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ');
            expect(result!.type).toBe('youtube');
            expect(result!.contentId).toBe('dQw4w9WgXcQ');
        });

        it('parses URL with extra params', () => {
            const result = parseUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120&list=PLxyz');
            expect(result!.contentId).toBe('dQw4w9WgXcQ');
        });

        it('generates correct embed URL', () => {
            const result = parseUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            expect(result!.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
        });

        it('rejects youtube.com without video ID', () => {
            const result = parseUrl('https://www.youtube.com/');
            expect(result!.type).not.toBe('youtube');
        });
    });

    describe('Twitter', () => {
        it('parses twitter.com status URL', () => {
            const result = parseUrl('https://twitter.com/elonmusk/status/1234567890123456789');
            expect(result!.type).toBe('twitter');
            expect(result!.contentId).toBe('1234567890123456789');
            expect(result!.canEmbed).toBe(true);
        });

        it('parses x.com status URL', () => {
            const result = parseUrl('https://x.com/OpenAI/status/9876543210987654321');
            expect(result!.type).toBe('twitter');
            expect(result!.contentId).toBe('9876543210987654321');
        });

        it('parses URL with query params', () => {
            const result = parseUrl('https://twitter.com/user/status/1234567890123456789?s=20');
            expect(result!.contentId).toBe('1234567890123456789');
        });

        it('parses mobile twitter URL', () => {
            const result = parseUrl('https://mobile.twitter.com/user/status/1234567890123456789');
            expect(result!.type).toBe('twitter');
        });

        it('rejects twitter.com profile URL (no status)', () => {
            const result = parseUrl('https://twitter.com/elonmusk');
            expect(result!.type).not.toBe('twitter');
        });
    });

    describe('Generic (fallback)', () => {
        it('handles any valid HTTP URL', () => {
            const result = parseUrl('https://example.com/some/page');
            expect(result).not.toBeNull();
            expect(result!.type).toBe('link');
            expect(result!.canEmbed).toBe(false);
        });

        it('generates consistent content ID for same URL', () => {
            const r1 = parseUrl('https://example.com/page');
            const r2 = parseUrl('https://example.com/page');
            expect(r1!.contentId).toBe(r2!.contentId);
        });

        it('generates different IDs for different URLs', () => {
            const r1 = parseUrl('https://example.com/page1');
            const r2 = parseUrl('https://example.com/page2');
            expect(r1!.contentId).not.toBe(r2!.contentId);
        });
    });

    describe('Invalid URLs', () => {
        it('returns null for empty string', () => {
            expect(parseUrl('')).toBeNull();
        });

        it('returns null for non-URL string', () => {
            expect(parseUrl('not a url')).toBeNull();
        });

        it('returns null for ftp protocol', () => {
            expect(parseUrl('ftp://files.example.com/doc.pdf')).toBeNull();
        });
    });
});

describe('isValidUrl', () => {
    it('accepts http URLs', () => {
        expect(isValidUrl('http://example.com')).toBe(true);
    });

    it('accepts https URLs', () => {
        expect(isValidUrl('https://example.com')).toBe(true);
    });

    it('rejects ftp URLs', () => {
        expect(isValidUrl('ftp://example.com')).toBe(false);
    });

    it('rejects non-URLs', () => {
        expect(isValidUrl('not-a-url')).toBe(false);
    });
});
