import { prisma } from "@/lib/prisma";

export async function measureOrgOutcomes(args: {
  orgId: string;
  scope: string;
  before: any;
  after: any;
  suggestionRunId: string;
}) {
  const improved = JSON.stringify(args.after) !== JSON.stringify(args.before);

  await prisma.loopBrainOutcome.create({
    data: {
      orgId: args.orgId,
      scope: args.scope,
      suggestionRunId: args.suggestionRunId,
      beforeMetrics: args.before,
      afterMetrics: args.after,
      improved,
    },
  });

  return improved;
}

