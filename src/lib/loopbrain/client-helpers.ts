// src/lib/loopbrain/client-helpers.ts

"use client";

import { useLoopbrainAssistant } from "@/components/loopbrain/assistant-context";
import { useWorkspace } from "@/lib/workspace-context";
import { buildRoleIdFromPosition, buildRoleIdFromRoleCard } from "@/lib/org/context/roleId";

/**
 * Open Loopbrain chat for a specific role.
 * Sets the assistant mode to "org" and anchors to the role ID.
 */
export function useOpenLoopbrainForRole() {
  const { setIsOpen, setMode, setAnchors, addMessage } = useLoopbrainAssistant();
  const workspace = useWorkspace();

  return (params: {
    roleId: string; // Canonical role ID (e.g., "role:workspace:position:id") or position/roleCard ID
    initialQuestion?: string;
    positionId?: string; // If provided, will build canonical ID from position
    roleCardId?: string; // If provided, will build canonical ID from roleCard
  }) => {
    const { roleId, initialQuestion, positionId, roleCardId } = params;

    // Build canonical role ID if needed
    let canonicalRoleId = roleId;
    if (!roleId.startsWith("role:") && workspace?.currentWorkspace?.id) {
      const wsId = workspace.currentWorkspace.id;
      if (positionId) {
        canonicalRoleId = buildRoleIdFromPosition(wsId, positionId);
      } else if (roleCardId) {
        canonicalRoleId = buildRoleIdFromRoleCard(wsId, roleCardId);
      } else {
        // Fallback: assume it's a position ID
        canonicalRoleId = buildRoleIdFromPosition(wsId, roleId);
      }
    }

    // Set mode to org
    setMode("org");

    // Set anchors with roleId
    setAnchors({
      roleId: canonicalRoleId,
    });

    // Add initial question if provided
    if (initialQuestion) {
      addMessage({
        id: Date.now().toString(),
        role: "user",
        content: initialQuestion,
        timestamp: new Date(),
      });
    }

    // Open the assistant panel
    setIsOpen(true);
  };
}

/**
 * Open Loopbrain chat for a specific person.
 * Sets the assistant mode to "org" and anchors to the person ID.
 */
export function useOpenLoopbrainForPerson() {
  const { setIsOpen, setMode, setAnchors, addMessage } = useLoopbrainAssistant();

  return (params: {
    personId: string; // Canonical person ID (e.g., "person:userId")
    initialQuestion?: string;
  }) => {
    const { personId, initialQuestion } = params;

    // Set mode to org
    setMode("org");

    // Set anchors with personId
    setAnchors({
      personId: personId,
    });

    // Add initial question if provided
    if (initialQuestion) {
      addMessage({
        id: Date.now().toString(),
        role: "user",
        content: initialQuestion,
        timestamp: new Date(),
      });
    }

    // Open the assistant panel
    setIsOpen(true);
  };
}

/**
 * Open Loopbrain chat for a specific team.
 * Sets the assistant mode to "org" and anchors to the team ID.
 */
export function useOpenLoopbrainForTeam() {
  const { setIsOpen, setMode, setAnchors, addMessage } = useLoopbrainAssistant();

  return (params: {
    teamId: string; // Canonical team ID (e.g., "team:teamId")
    initialQuestion?: string;
  }) => {
    const { teamId, initialQuestion } = params;

    // Set mode to org
    setMode("org");

    // Set anchors with teamId
    setAnchors({
      teamId: teamId,
    });

    // Add initial question if provided
    if (initialQuestion) {
      addMessage({
        id: Date.now().toString(),
        role: "user",
        content: initialQuestion,
        timestamp: new Date(),
      });
    }

    // Open the assistant panel
    setIsOpen(true);
  };
}

/**
 * Open Loopbrain chat for Org health explanation.
 * Sets the assistant mode to "org" with no specific anchors (org-wide focus).
 */
export function useOpenLoopbrainForOrgHealth() {
  const { setIsOpen, setMode, setAnchors, addMessage } = useLoopbrainAssistant();

  return (params?: {
    initialQuestion?: string;
  }) => {
    const { initialQuestion } = params || {};

    // Set mode to org
    setMode("org");

    // Clear anchors for org-wide health focus
    setAnchors({});

    // Add initial question if provided
    if (initialQuestion) {
      addMessage({
        id: Date.now().toString(),
        role: "user",
        content: initialQuestion,
        timestamp: new Date(),
      });
    }

    // Open the assistant panel
    setIsOpen(true);
  };
}

