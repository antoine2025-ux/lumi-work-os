"use client";

export function DigestPreview({ digest }: { digest: any }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-4 text-sm dark:border-white/10 dark:bg-white/5">
      <div className="font-semibold">Weekly Org Summary</div>
      <div className="mt-2">
        Org completeness: <strong>{digest.score}%</strong>
      </div>

      <div className="mt-3">
        <div className="text-xs text-black/50 dark:text-white/50">Top actions</div>
        <ul className="mt-1 list-disc pl-4">
          {digest.topActions?.map((a: any) => (
            <li key={a.key}>
              {a.label} ({a.count})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

