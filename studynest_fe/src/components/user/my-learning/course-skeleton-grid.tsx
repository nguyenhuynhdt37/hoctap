export const CourseSkeletonGrid = ({ count }: { count: number }) => (
  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="h-72 animate-pulse rounded-2xl border border-green-200 bg-white"
      >
        <div className="h-1/2 rounded-t-2xl bg-green-100/40" />
        <div className="space-y-4 p-6">
          <div className="h-4 rounded bg-green-100/60" />
          <div className="h-4 w-1/2 rounded bg-green-100/40" />
          <div className="h-3 rounded bg-green-100/60" />
        </div>
      </div>
    ))}
  </div>
);

