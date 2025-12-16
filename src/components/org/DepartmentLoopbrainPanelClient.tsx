"use client";

import { DepartmentLoopbrainPanel } from "./DepartmentLoopbrainPanel";

type DepartmentLoopbrainPanelClientProps = {
  departmentId: string;
  departmentName?: string;
};

/**
 * Client wrapper for DepartmentLoopbrainPanel
 * Used when the parent page is a server component
 */
export function DepartmentLoopbrainPanelClient({
  departmentId,
  departmentName,
}: DepartmentLoopbrainPanelClientProps) {
  return (
    <DepartmentLoopbrainPanel
      departmentId={departmentId}
      departmentName={departmentName}
    />
  );
}

