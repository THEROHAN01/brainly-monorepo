/**
 * pgai Vectorizer Setup Script
 *
 * Run once after PostgreSQL + pgai are set up:
 *   npm run setup:pgai
 *
 * This installs the pgai extension and creates a vectorizer that
 * automatically generates and syncs embeddings for content.full_text.
 * The vectorizer worker (Docker service) picks up changes and generates
 * embeddings without any application code.
 */

import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();

async function setupPgai() {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    console.log("Connected to PostgreSQL");

    try {
        // Enable pgai extension (requires timescaledb-ha image)
        await client.query("CREATE EXTENSION IF NOT EXISTS ai CASCADE;");
        console.log("✓ pgai extension enabled");

        // Create vectorizer for content full_text.
        // The vectorizer worker auto-chunks, formats, and embeds content
        // whenever full_text is inserted or updated — no app code needed.
        await client.query(`
            SELECT ai.create_vectorizer(
                'contents'::regclass,
                loading    => ai.loading_column('full_text'),
                chunking   => ai.chunking_recursive_character_text_splitter(
                                chunk_size => 1000, chunk_overlap => 200),
                formatting => ai.formatting_python_template(
                                'Title: $title' || E'\\n' || 'Type: $type' || E'\\n\\n' || '$chunk'),
                embedding  => ai.embedding_openai('text-embedding-3-small', 1536)
            );
        `);
        console.log("✓ Vectorizer created for contents.full_text");
        console.log("  Embeddings will auto-sync via the vectorizer worker Docker service.");
        console.log("  Run: docker compose up -d vectorizer-worker");
    } catch (err: any) {
        if (err.message?.includes("already exists")) {
            console.log("  Vectorizer already exists, skipping");
        } else {
            throw err;
        }
    } finally {
        await client.end();
    }
}

setupPgai().catch((err) => {
    console.error("pgai setup failed:", err.message);
    process.exit(1);
});
