export default function Loading() {
  return (
    <div className="p-6 space-y-3">
      <div className="h-5 w-32 rounded bg-black/10 dark:bg-white/10" />
      <div className="h-4 w-96 rounded bg-black/10 dark:bg-white/10" />
      <div className="h-24 rounded-2xl bg-black/10 dark:bg-white/10" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-black/10 dark:bg-white/10" />
        ))}
      </div>
    </div>
  );
}

