import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl.replace(/\/$/, '');
  return source.getPages().map((page) => ({
    url: `${base}${page.url}`,
    changeFrequency: 'weekly',
    priority: page.url === '/docs' ? 1 : 0.7,
  }));
}
