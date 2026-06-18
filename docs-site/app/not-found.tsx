import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-fd-muted-foreground text-sm font-medium">404</p>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-fd-muted-foreground max-w-md">
        We couldn&apos;t find that page. It may have moved or never existed.
      </p>
      <Link
        href="/docs"
        className="bg-fd-primary text-fd-primary-foreground mt-2 rounded-md px-4 py-2 text-sm font-medium"
      >
        Back to docs
      </Link>
    </main>
  );
}
