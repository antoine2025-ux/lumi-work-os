import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function measureOrgOutcomes(args: {
  orgId: string;
  scope: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  suggestionRunId: string;
}) {
  const improved = JSON.stringify(args.after) !== JSON.stringify(args.before);

  await prisma.loopBrainOutcome.create({
    data: {
      workspaceId: args.orgId,
      scope: args.scope,
      suggestionRunId: args.suggestionRunId,
      beforeMetrics: args.before as Prisma.InputJsonValue,
      afterMetrics: args.after as Prisma.InputJsonValue,
      improved,
    },
  });

  return improved;
}

