export function CardSkeleton() {
  return (
    <div className="bg-brand-surface rounded-xl border border-brand-border p-5 animate-pulse">
      {/* Skeleton for icon/embed area */}
      <div className="w-full h-32 bg-brand-border/50 rounded-lg mb-4"></div>

      {/* Skeleton for title */}
      <div className="h-5 bg-brand-border/50 rounded w-3/4 mb-3"></div>

      {/* Skeleton for tags */}
      <div className="flex gap-2 mb-4">
        <div className="h-6 bg-brand-border/50 rounded w-16"></div>
        <div className="h-6 bg-brand-border/50 rounded w-20"></div>
      </div>

      {/* Skeleton for buttons */}
      <div className="flex gap-2">
        <div className="h-8 bg-brand-border/50 rounded flex-1"></div>
        <div className="h-8 bg-brand-border/50 rounded w-8"></div>
      </div>
    </div>
  );
}

export function CardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4'>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
