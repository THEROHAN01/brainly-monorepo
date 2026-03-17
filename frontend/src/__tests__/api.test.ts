import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/auth', () => ({
    getToken: vi.fn(() => 'mock-token'),
    removeToken: vi.fn(),
}));

vi.mock('../config', () => ({
    BACKEND_URL: 'http://localhost:5000',
}));

import api from '../lib/api';

describe('API instance', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('has correct baseURL', () => {
        expect(api.defaults.baseURL).toBe('http://localhost:5000');
    });

    it('is an axios instance with standard methods', () => {
        expect(typeof api.get).toBe('function');
        expect(typeof api.post).toBe('function');
        expect(typeof api.delete).toBe('function');
        expect(typeof api.put).toBe('function');
    });
});
