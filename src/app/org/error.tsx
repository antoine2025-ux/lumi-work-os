"use client";

import { useEffect } from "react";

export default function OrgError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[OrgError]", error);
  }, [error]);

  return (
    <div className="px-10 pt-10">
      <div className="max-w-lg rounded-2xl border border-red-900/60 bg-red-950/60 px-6 py-6 text-[13px] text-red-100">
        <div className="mb-2 text-[14px] font-semibold">
          Org Center ran into a problem
        </div>
        <p className="mb-3 text-[12px] text-red-200/80">
          Something went wrong while loading this Org page. This has been logged for review.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="focus-ring rounded-full bg-red-100 px-4 py-1.5 text-[12px] font-medium text-red-900 transition-colors hover:bg-white"
          aria-label="Try again"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

