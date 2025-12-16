// scripts/dev-inspect-org-workspace-context.ts
// Run via: ts-node scripts/dev-inspect-org-workspace-context.ts <workspaceId>

import "dotenv/config";
import { prisma } from "@/lib/db";
import { loadOrgWorkspaceContext } from "@/lib/context/org/loadOrgWorkspaceContext";

async function main() {
  const workspaceId = process.argv[2];

  if (!workspaceId) {
    console.error("Usage: ts-node scripts/dev-inspect-org-workspace-context.ts <workspaceId>");
    process.exit(1);
  }

  const ctx = await loadOrgWorkspaceContext(workspaceId);
  console.log(JSON.stringify(ctx, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

