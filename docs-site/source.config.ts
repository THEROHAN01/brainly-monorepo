import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';

export const docs = defineDocs({
  dir: 'content/docs',
});

export default defineConfig({
  mdxOptions: {
    // Converts ```mermaid code fences into the <Mermaid /> component automatically.
    remarkPlugins: [remarkMdxMermaid],
  },
});
