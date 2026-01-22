import { prisma } from "@/lib/db";
import { getEngineById, getFallbackEngineForScope } from "./registry";

export async function selectEngineForOrg(args: { orgId: string; scope: string }) {
  const cfg = await prisma.orgLoopBrainConfig.findUnique({
    where: { orgId_scope: { orgId: args.orgId, scope: args.scope } },
  });

  if (cfg && cfg.enabled) {
    const engine = getEngineById(cfg.engineId);
    if (engine) return { engine, engineId: engine.id };
  }

  const fallback = getFallbackEngineForScope(args.scope);
  if (!fallback) throw new Error(`No engine available for scope ${args.scope}`);
  return { engine: fallback, engineId: fallback.id };
}

