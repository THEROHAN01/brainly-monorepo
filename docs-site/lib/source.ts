import { docs } from '@/.source/server';
import { loader } from 'fumadocs-core/source';

// `loader()` builds the page tree + lookup helpers from the generated source.
export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
});
