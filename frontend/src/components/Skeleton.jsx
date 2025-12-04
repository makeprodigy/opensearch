export default function Skeleton({ rows = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-32 animate-pulse rounded-xl"
          style={{
            backgroundColor: '#E8F5E9',
            backgroundImage: 'linear-gradient(90deg, #E8F5E9 0%, #D4EAD8 50%, #E8F5E9 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite'
          }}
        />
      ))}
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}
