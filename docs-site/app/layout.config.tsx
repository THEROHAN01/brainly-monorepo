import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

/**
 * Shared layout options (navbar title, links, etc.).
 * Consumed by the docs layout.
 */
export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <>
        <span className="font-bold">🧠 Brainly</span>
        <span className="text-fd-muted-foreground font-normal">Docs</span>
      </>
    ),
  },
  // Set this to the repository URL to enable the navbar GitHub link, e.g.
  // githubUrl: 'https://github.com/<org>/brainly-monorepo',
};
