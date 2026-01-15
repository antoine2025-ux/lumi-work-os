"use client";

import { RoleLoopbrainPanel } from "./RoleLoopbrainPanel";

type RoleLoopbrainPanelClientProps = {
  positionId: string;
  roleName?: string;
};

/**
 * Client wrapper for RoleLoopbrainPanel
 * Used when the parent page is a server component
 */
export function RoleLoopbrainPanelClient({
  positionId,
  roleName,
}: RoleLoopbrainPanelClientProps) {
  return (
    <RoleLoopbrainPanel
      positionId={positionId}
      roleName={roleName}
    />
  );
}

