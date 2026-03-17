import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';

let token: string;

// Recreate user + token before each test (afterEach clears DB)
beforeEach(async () => {
    await request(app)
        .post('/api/v1/signup')
        .send({ username: 'contentuser', password: 'password123' });

    const res = await request(app)
        .post('/api/v1/signin')
        .send({ username: 'contentuser', password: 'password123' });

    token = res.body.token;
});

function auth() {
    return { Authorization: `Bearer ${token}` };
}

describe('POST /api/v1/content', () => {
    it('creates content with a YouTube URL', async () => {
        const res = await request(app)
            .post('/api/v1/content')
            .set(auth())
            .send({
                title: 'Test Video',
                link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            });

        expect(res.status).toBe(201);
        expect(res.body.content.type).toBe('youtube');
        expect(res.body.content.contentId).toBe('dQw4w9WgXcQ');
    });

    it('creates content with a Twitter URL', async () => {
        const res = await request(app)
            .post('/api/v1/content')
            .set(auth())
            .send({
                title: 'Test Tweet',
                link: 'https://twitter.com/user/status/1234567890123456789'
            });

        expect(res.status).toBe(201);
        expect(res.body.content.type).toBe('twitter');
    });

    it('creates content with a generic URL', async () => {
        const res = await request(app)
            .post('/api/v1/content')
            .set(auth())
            .send({
                title: 'Test Link',
                link: 'https://example.com/article'
            });

        expect(res.status).toBe(201);
        expect(res.body.content.type).toBe('link');
    });

    it('rejects missing title', async () => {
        const res = await request(app)
            .post('/api/v1/content')
            .set(auth())
            .send({ link: 'https://example.com' });

        expect(res.status).toBe(400);
    });

    it('rejects missing link', async () => {
        const res = await request(app)
            .post('/api/v1/content')
            .set(auth())
            .send({ title: 'No Link' });

        expect(res.status).toBe(400);
    });

    it('rejects invalid URL', async () => {
        const res = await request(app)
            .post('/api/v1/content')
            .set(auth())
            .send({ title: 'Bad URL', link: 'not-a-url' });

        expect(res.status).toBe(400);
    });

    it('rejects title over 500 characters', async () => {
        const res = await request(app)
            .post('/api/v1/content')
            .set(auth())
            .send({ title: 'a'.repeat(501), link: 'https://example.com' });

        expect(res.status).toBe(400);
    });
});

describe('GET /api/v1/content', () => {
    it('returns user content with pagination metadata', async () => {
        // Create content first
        await request(app)
            .post('/api/v1/content')
            .set(auth())
            .send({ title: 'Item', link: 'https://example.com/1' });

        const res = await request(app)
            .get('/api/v1/content')
            .set(auth());

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.content)).toBe(true);
        expect(res.body.content.length).toBe(1);
        expect(res.body.pagination).toBeDefined();
        expect(res.body.pagination.total).toBe(1);
        expect(typeof res.body.pagination.hasMore).toBe('boolean');
    });

    it('respects limit parameter', async () => {
        await request(app).post('/api/v1/content').set(auth())
            .send({ title: 'A', link: 'https://example.com/a' });
        await request(app).post('/api/v1/content').set(auth())
            .send({ title: 'B', link: 'https://example.com/b' });

        const res = await request(app)
            .get('/api/v1/content?limit=1')
            .set(auth());

        expect(res.body.content.length).toBe(1);
        expect(res.body.pagination.limit).toBe(1);
        expect(res.body.pagination.hasMore).toBe(true);
    });

    it('does not return other users content', async () => {
        // Create content as main user
        await request(app).post('/api/v1/content').set(auth())
            .send({ title: 'Private', link: 'https://example.com/priv' });

        // Create second user
        await request(app).post('/api/v1/signup')
            .send({ username: 'otheruser', password: 'password123' });
        const other = await request(app).post('/api/v1/signin')
            .send({ username: 'otheruser', password: 'password123' });

        const res = await request(app)
            .get('/api/v1/content')
            .set({ Authorization: `Bearer ${other.body.token}` });

        expect(res.body.content.length).toBe(0);
    });
});

describe('DELETE /api/v1/content', () => {
    it('deletes own content', async () => {
        const created = await request(app)
            .post('/api/v1/content')
            .set(auth())
            .send({ title: 'To Delete', link: 'https://example.com/del' });

        const res = await request(app)
            .delete('/api/v1/content')
            .set(auth())
            .send({ contentId: created.body.content._id });

        expect(res.status).toBe(200);

        // Verify it's gone
        const list = await request(app).get('/api/v1/content').set(auth());
        expect(list.body.content.length).toBe(0);
    });

    it('returns 404 for nonexistent content', async () => {
        const res = await request(app)
            .delete('/api/v1/content')
            .set(auth())
            .send({ contentId: '000000000000000000000000' });

        expect(res.status).toBe(404);
    });

    it('rejects missing contentId', async () => {
        const res = await request(app)
            .delete('/api/v1/content')
            .set(auth())
            .send({});

        expect(res.status).toBe(400);
    });

    it('cannot delete another users content', async () => {
        const created = await request(app)
            .post('/api/v1/content')
            .set(auth())
            .send({ title: 'Protected', link: 'https://example.com/protect' });

        // Create second user
        await request(app).post('/api/v1/signup')
            .send({ username: 'attacker', password: 'password123' });
        const attacker = await request(app).post('/api/v1/signin')
            .send({ username: 'attacker', password: 'password123' });

        const res = await request(app)
            .delete('/api/v1/content')
            .set({ Authorization: `Bearer ${attacker.body.token}` })
            .send({ contentId: created.body.content._id });

        expect(res.status).toBe(404);
    });
});
