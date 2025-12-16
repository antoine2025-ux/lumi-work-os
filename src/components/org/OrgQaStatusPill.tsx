// src/components/org/OrgQaStatusPill.tsx
"use client";

import React from "react";
import type { OrgQaStatus } from "@/lib/org/qa/types";
import clsx from "clsx";

interface OrgQaStatusPillProps {
  status: OrgQaStatus;
}

const labelByStatus: Record<OrgQaStatus, string> = {
  pass: "Pass",
  partial: "Partial",
  fail: "Fail",
  stub: "Stub",
};

export function OrgQaStatusPill({ status }: OrgQaStatusPillProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "pass" && "bg-emerald-100 text-emerald-800",
        status === "partial" && "bg-amber-100 text-amber-800",
        status === "fail" && "bg-rose-100 text-rose-800",
        status === "stub" && "bg-slate-100 text-slate-700"
      )}
    >
      {labelByStatus[status]}
    </span>
  );
}

export default OrgQaStatusPill;

