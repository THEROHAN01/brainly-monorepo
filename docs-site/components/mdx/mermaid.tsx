import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { renderMermaidSVG } from 'beautiful-mermaid';

/**
 * Server component that renders a Mermaid diagram to inline SVG using
 * beautiful-mermaid. ```mermaid code fences are rewritten into <Mermaid />
 * by the remarkMdxMermaid plugin (see source.config.ts).
 *
 * Falls back to a syntax-highlighted code block if rendering throws.
 */
export async function Mermaid({ chart }: { chart: string }) {
  try {
    const svg = renderMermaidSVG(chart, {
      bg: 'var(--color-fd-background)',
      fg: 'var(--color-fd-foreground)',
      interactive: true,
      transparent: true,
    });

    return (
      <div
        className="my-4 flex justify-center overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  } catch {
    return (
      <CodeBlock title="Mermaid">
        <Pre>{chart}</Pre>
      </CodeBlock>
    );
  }
}
