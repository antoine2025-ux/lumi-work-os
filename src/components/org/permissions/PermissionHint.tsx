"use client";

export function PermissionHint({ message }: { message: string }) {
  return (
    <p className="mt-1 text-[11px] text-slate-500">
      {message}
    </p>
  );
}

