"use client";

import { Badge } from "@/components/ui/badge";

export function SeverityBadge({ severity }: { severity: "LOW" | "MEDIUM" | "HIGH" }) {
  const variant = severity === "HIGH" ? "destructive" : "secondary";
  return <Badge variant={variant}>{severity}</Badge>;
}

