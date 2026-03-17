import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';

describe('POST /api/v1/signup', () => {
    it('creates a new user with valid input', async () => {
        const res = await request(app)
            .post('/api/v1/signup')
            .send({ username: 'testuser', password: 'password123' });

        expect(res.status).toBe(201);
        expect(res.body.message).toBe('Account created successfully');
    });

    it('rejects duplicate username', async () => {
        await request(app)
            .post('/api/v1/signup')
            .send({ username: 'dupeuser', password: 'password123' });

        const res = await request(app)
            .post('/api/v1/signup')
            .send({ username: 'dupeuser', password: 'password456' });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Username already exists');
    });

    it('rejects short username (< 3 chars)', async () => {
        const res = await request(app)
            .post('/api/v1/signup')
            .send({ username: 'ab', password: 'password123' });

        expect(res.status).toBe(400);
    });

    it('rejects short password (< 6 chars)', async () => {
        const res = await request(app)
            .post('/api/v1/signup')
            .send({ username: 'testuser2', password: '12345' });

        expect(res.status).toBe(400);
    });

    it('rejects username with special characters', async () => {
        const res = await request(app)
            .post('/api/v1/signup')
            .send({ username: 'test user!', password: 'password123' });

        expect(res.status).toBe(400);
    });

    it('rejects empty body', async () => {
        const res = await request(app)
            .post('/api/v1/signup')
            .send({});

        expect(res.status).toBe(400);
    });
});

describe('POST /api/v1/signin', () => {
    // Recreate user before each test since afterEach clears the DB
    beforeEach(async () => {
        await request(app)
            .post('/api/v1/signup')
            .send({ username: 'signinuser', password: 'password123' });
    });

    it('returns JWT token with valid credentials', async () => {
        const res = await request(app)
            .post('/api/v1/signin')
            .send({ username: 'signinuser', password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(typeof res.body.token).toBe('string');
    });

    it('rejects wrong password', async () => {
        const res = await request(app)
            .post('/api/v1/signin')
            .send({ username: 'signinuser', password: 'wrongpassword' });

        expect(res.status).toBe(403);
    });

    it('rejects nonexistent user', async () => {
        const res = await request(app)
            .post('/api/v1/signin')
            .send({ username: 'nonexistent', password: 'password123' });

        expect(res.status).toBe(400);
    });

    it('rejects empty username', async () => {
        const res = await request(app)
            .post('/api/v1/signin')
            .send({ username: '', password: 'password123' });

        expect(res.status).toBe(400);
    });
});

describe('Protected routes — JWT middleware', () => {
    it('rejects request without Authorization header', async () => {
        const res = await request(app).get('/api/v1/content');
        expect(res.status).toBe(401);
    });

    it('rejects invalid token', async () => {
        const res = await request(app)
            .get('/api/v1/content')
            .set('Authorization', 'Bearer invalid-token-here');

        expect(res.status).toBe(401);
    });

    it('rejects malformed Authorization header', async () => {
        const res = await request(app)
            .get('/api/v1/content')
            .set('Authorization', 'NotBearer some-token');

        expect(res.status).toBe(401);
    });

    it('accepts request with valid token', async () => {
        await request(app)
            .post('/api/v1/signup')
            .send({ username: 'jwtuser', password: 'password123' });

        const signin = await request(app)
            .post('/api/v1/signin')
            .send({ username: 'jwtuser', password: 'password123' });

        const res = await request(app)
            .get('/api/v1/content')
            .set('Authorization', `Bearer ${signin.body.token}`);

        expect(res.status).toBe(200);
    });
});
