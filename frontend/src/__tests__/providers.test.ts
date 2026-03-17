import { describe, it, expect } from 'vitest';
import { parseUrl, quickValidateUrl, isValidUrl } from '../providers';

describe('parseUrl (frontend)', () => {
    it('parses YouTube watch URL', () => {
        const result = parseUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        expect(result!.type).toBe('youtube');
        expect(result!.contentId).toBe('dQw4w9WgXcQ');
    });

    it('parses youtu.be short URL', () => {
        const result = parseUrl('https://youtu.be/dQw4w9WgXcQ');
        expect(result!.type).toBe('youtube');
        expect(result!.contentId).toBe('dQw4w9WgXcQ');
    });

    it('parses YouTube shorts URL', () => {
        const result = parseUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ');
        expect(result!.type).toBe('youtube');
    });

    it('parses Twitter status URL', () => {
        const result = parseUrl('https://twitter.com/user/status/1234567890123456789');
        expect(result!.type).toBe('twitter');
        expect(result!.contentId).toBe('1234567890123456789');
    });

    it('parses x.com status URL', () => {
        const result = parseUrl('https://x.com/user/status/9876543210987654321');
        expect(result!.type).toBe('twitter');
    });

    it('parses generic URL as link', () => {
        const result = parseUrl('https://example.com');
        expect(result!.type).toBe('link');
    });

    it('returns null for invalid URL', () => {
        expect(parseUrl('not-a-url')).toBeNull();
    });

    it('returns null for empty string', () => {
        expect(parseUrl('')).toBeNull();
    });

    it('generates consistent ID for same URL', () => {
        const r1 = parseUrl('https://example.com/page');
        const r2 = parseUrl('https://example.com/page');
        expect(r1!.contentId).toBe(r2!.contentId);
    });
});

describe('quickValidateUrl', () => {
    it('returns valid with type info for YouTube URL', () => {
        const result = quickValidateUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        expect(result.valid).toBe(true);
        expect(result.type).toBe('youtube');
        expect(result.displayName).toBe('YouTube');
        expect(result.canEmbed).toBe(true);
        expect(result.embedUrl).toBeDefined();
    });

    it('returns invalid for empty string', () => {
        const result = quickValidateUrl('');
        expect(result.valid).toBe(false);
    });

    it('returns invalid for garbage input', () => {
        const result = quickValidateUrl('asdfghjkl');
        expect(result.valid).toBe(false);
        expect(result.message).toBeDefined();
    });

    it('returns canEmbed false for generic links', () => {
        const result = quickValidateUrl('https://example.com');
        expect(result.valid).toBe(true);
        expect(result.canEmbed).toBe(false);
    });
});

describe('isValidUrl', () => {
    it('accepts https', () => expect(isValidUrl('https://example.com')).toBe(true));
    it('accepts http', () => expect(isValidUrl('http://example.com')).toBe(true));
    it('rejects ftp', () => expect(isValidUrl('ftp://example.com')).toBe(false));
    it('rejects garbage', () => expect(isValidUrl('not-a-url')).toBe(false));
});
