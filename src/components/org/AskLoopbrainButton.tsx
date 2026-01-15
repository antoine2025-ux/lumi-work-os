// src/components/org/AskLoopbrainButton.tsx

"use client";

import { useOpenLoopbrainForRole } from "@/lib/loopbrain/client-helpers";

interface AskLoopbrainButtonProps {
  positionId: string;
  initialQuestion?: string;
  className?: string;
}

export function AskLoopbrainButton({
  positionId,
  initialQuestion = "What are the key responsibilities and expectations for this role?",
  className = "",
}: AskLoopbrainButtonProps) {
  const openLoopbrainForRole = useOpenLoopbrainForRole();

  return (
    <button
      type="button"
      onClick={() =>
        openLoopbrainForRole({
          roleId: positionId, // Will be converted to canonical ID
          positionId: positionId,
          initialQuestion,
        })
      }
      className={`inline-flex items-center gap-1 rounded-md border border-gray-700 bg-gray-900 px-3 py-1 text-xs hover:bg-gray-800 ${className}`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
      Ask Loopbrain about this role
    </button>
  );
}

