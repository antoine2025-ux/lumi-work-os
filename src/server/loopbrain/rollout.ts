import { prisma } from "@/lib/db";

export async function isLoopBrainEnabledForUser(args: {
  orgId: string;
  scope: string;
  role: string;
  teamName?: string | null;
}) {
  const cfg = await prisma.orgLoopBrainRollout.findUnique({
    where: { orgId_scope: { orgId: args.orgId, scope: args.scope } },
  });

  if (!cfg || !cfg.enabled) return false;

  if (cfg.mode === "ALL") return true;
  if (cfg.mode === "ADMIN_ONLY") return args.role === "ADMIN";
  if (cfg.mode === "MANAGERS_ONLY") return args.role === "MANAGER" || args.role === "ADMIN";
  if (cfg.mode === "TEAM" && cfg.teamName) {
    return args.teamName === cfg.teamName;
  }

  return false;
}

