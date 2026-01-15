// Temporary debug component to identify errors
export function DebugError({ error, location }: { error: any; location: string }) {
  if (process.env.NODE_ENV === "production") return null;
  
  return (
    <div className="rounded-2xl border border-red-900/60 bg-red-950/60 px-6 py-6 text-[13px] text-red-100">
      <div className="font-semibold">Debug Error at {location}</div>
      <div className="mt-2 text-red-200">
        <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(error, null, 2)}</pre>
      </div>
    </div>
  );
}

