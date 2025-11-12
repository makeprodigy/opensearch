export default function Skeleton({ rows = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-32 animate-pulse rounded-xl bg-slate-800/60"
        />
      ))}
    </div>
  );
}

