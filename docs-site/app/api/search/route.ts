import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

// Full-text search over all docs pages (default Orama server search).
export const { GET } = createFromSource(source);
