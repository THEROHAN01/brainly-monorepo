import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';

let token: string;

beforeEach(async () => {
    await request(app)
        .post('/api/v1/signup')
        .send({ username: 'shareuser', password: 'password123' });

    const res = await request(app)
        .post('/api/v1/signin')
        .send({ username: 'shareuser', password: 'password123' });

    token = res.body.token;

    // Add content to share
    await request(app)
        .post('/api/v1/content')
        .set({ Authorization: `Bearer ${token}` })
        .send({ title: 'Shared Item', link: 'https://example.com/shared' });
});

describe('POST /api/v1/brain/share', () => {
    it('creates a share link', async () => {
        const res = await request(app)
            .post('/api/v1/brain/share')
            .set({ Authorization: `Bearer ${token}` })
            .send({ share: true });

        expect(res.status).toBe(200);
        expect(res.body.hash).toBeDefined();
        expect(typeof res.body.hash).toBe('string');
        expect(res.body.hash.length).toBeGreaterThan(0);
    });

    it('returns same hash on repeated calls', async () => {
        const r1 = await request(app)
            .post('/api/v1/brain/share')
            .set({ Authorization: `Bearer ${token}` })
            .send({ share: true });

        const r2 = await request(app)
            .post('/api/v1/brain/share')
            .set({ Authorization: `Bearer ${token}` })
            .send({ share: true });

        expect(r1.body.hash).toBe(r2.body.hash);
    });

    it('removes share link when share is false', async () => {
        // Create first
        await request(app)
            .post('/api/v1/brain/share')
            .set({ Authorization: `Bearer ${token}` })
            .send({ share: true });

        // Then remove
        const res = await request(app)
            .post('/api/v1/brain/share')
            .set({ Authorization: `Bearer ${token}` })
            .send({ share: false });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('removed link');
    });
});

describe('GET /api/v1/brain/:shareLink', () => {
    it('returns shared content for valid hash', async () => {
        const share = await request(app)
            .post('/api/v1/brain/share')
            .set({ Authorization: `Bearer ${token}` })
            .send({ share: true });

        const res = await request(app)
            .get(`/api/v1/brain/${share.body.hash}`);

        expect(res.status).toBe(200);
        expect(res.body.username).toBe('shareuser');
        expect(Array.isArray(res.body.content)).toBe(true);
        expect(res.body.content.length).toBe(1);
        expect(res.body.pagination).toBeDefined();
    });

    it('returns 404 for invalid hash', async () => {
        const res = await request(app)
            .get('/api/v1/brain/nonexistenthash');

        expect(res.status).toBe(404);
    });

    it('does not require authentication', async () => {
        const share = await request(app)
            .post('/api/v1/brain/share')
            .set({ Authorization: `Bearer ${token}` })
            .send({ share: true });

        // No Authorization header
        const res = await request(app)
            .get(`/api/v1/brain/${share.body.hash}`);

        expect(res.status).toBe(200);
    });

    it('returns 404 after share link is revoked', async () => {
        const share = await request(app)
            .post('/api/v1/brain/share')
            .set({ Authorization: `Bearer ${token}` })
            .send({ share: true });

        const hash = share.body.hash;

        // Revoke
        await request(app)
            .post('/api/v1/brain/share')
            .set({ Authorization: `Bearer ${token}` })
            .send({ share: false });

        const res = await request(app).get(`/api/v1/brain/${hash}`);
        expect(res.status).toBe(404);
    });
});
