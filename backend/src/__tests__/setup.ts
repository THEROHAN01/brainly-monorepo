import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterEach, afterAll } from 'vitest';

// Set env vars at top level BEFORE any source module imports.
// middleware.ts and index.ts check JWT_SECRET at module load time and crash if missing.
process.env.JWT_SECRET = 'test-secret-key-for-vitest';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.PORT = '0'; // let OS assign a port

let mongod: MongoMemoryServer;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGO_URI = uri;
    await mongoose.connect(uri);
});

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});
