import { prisma } from "@/lib/db";

/**
 * Minimal current-org resolution.
 * Replace later with real user/org membership + selection.
 */
export async function getCurrentOrgId(): Promise<string | null> {
  // For now, return the first workspace ID (temporary)
  // Later: replace with real user membership + persisted selection
  const workspace = await prisma.workspace.findFirst({ 
    select: { id: true }
  });
  return workspace?.id ?? null;
}

export async function getCurrentOrg(): Promise<{ id: string } | null> {
  const workspace = await prisma.workspace.findFirst({ 
    select: { id: true }
  });
  return workspace ? { id: workspace.id } : null;
}

