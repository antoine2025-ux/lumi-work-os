/**
 * CLI script to inspect Org context diagnostics for a workspace.
 * 
 * Usage:
 *   tsx scripts/inspect-org-context.ts <workspaceId>
 * 
 * Or via npm:
 *   npm run org:inspect <workspaceId>
 */

import "dotenv/config";
import { prisma } from "@/lib/db";
import { getOrgContextDiagnostics } from "@/lib/org/org-context-service";

async function main() {
  const workspaceId = process.argv[2];

  if (!workspaceId) {
    console.error("Usage: tsx scripts/inspect-org-context.ts <workspaceId>");
    console.error("Example: tsx scripts/inspect-org-context.ts clx012345000000000000000");
    process.exit(1);
  }

  try {
    console.log(`Inspecting Org context for workspace: ${workspaceId}\n`);

    const diagnostics = await getOrgContextDiagnostics(workspaceId);

    console.log("=== COUNTS ===");
    console.log(`Org: ${diagnostics.counts.org}`);
    console.log(`People: ${diagnostics.counts.people}`);
    console.log(`Teams: ${diagnostics.counts.teams}`);
    console.log(`Departments: ${diagnostics.counts.departments}`);
    console.log(`Roles: ${diagnostics.counts.roles}`);

    console.log("\n=== ISSUES ===");
    if (diagnostics.issues.missingOrgRoot) {
      console.log("⚠️  Missing org root ContextItem");
    }
    if (diagnostics.issues.multipleOrgRoots) {
      console.log(`⚠️  Multiple org roots found: ${diagnostics.counts.org}`);
    }
    if (diagnostics.issues.orphanPeopleWithoutRelations.length > 0) {
      console.log(
        `⚠️  ${diagnostics.issues.orphanPeopleWithoutRelations.length} people without team/department relations:`
      );
      diagnostics.issues.orphanPeopleWithoutRelations.forEach((id) => {
        console.log(`   - ${id}`);
      });
    }
    if (diagnostics.issues.itemsWithInvalidIdFormat.length > 0) {
      console.log(
        `⚠️  ${diagnostics.issues.itemsWithInvalidIdFormat.length} items with invalid ID format:`
      );
      diagnostics.issues.itemsWithInvalidIdFormat.forEach((id) => {
        console.log(`   - ${id}`);
      });
    }
    if (diagnostics.issues.itemsWithNoRelations.length > 0) {
      console.log(
        `⚠️  ${diagnostics.issues.itemsWithNoRelations.length} items with no relations:`
      );
      diagnostics.issues.itemsWithNoRelations.forEach((id) => {
        console.log(`   - ${id}`);
      });
    }

    if (
      !diagnostics.issues.missingOrgRoot &&
      !diagnostics.issues.multipleOrgRoots &&
      diagnostics.issues.orphanPeopleWithoutRelations.length === 0 &&
      diagnostics.issues.itemsWithInvalidIdFormat.length === 0 &&
      diagnostics.issues.itemsWithNoRelations.length === 0
    ) {
      console.log("✅ No issues detected");
    }

    console.log("\n=== SAMPLES ===");
    if (diagnostics.samples.org) {
      console.log("\nOrg:");
      console.log(`  ID: ${diagnostics.samples.org.id}`);
      console.log(`  Title: ${diagnostics.samples.org.title}`);
      console.log(`  Relations: ${diagnostics.samples.org.relations?.length || 0}`);
    }

    if (diagnostics.samples.people.length > 0) {
      console.log(`\nPeople (showing ${diagnostics.samples.people.length} of ${diagnostics.counts.people}):`);
      diagnostics.samples.people.forEach((person) => {
        console.log(`  - ${person.title} (${person.id})`);
        console.log(`    Relations: ${person.relations?.length || 0}`);
      });
    }

    if (diagnostics.samples.teams.length > 0) {
      console.log(`\nTeams (showing ${diagnostics.samples.teams.length} of ${diagnostics.counts.teams}):`);
      diagnostics.samples.teams.forEach((team) => {
        console.log(`  - ${team.title} (${team.id})`);
        console.log(`    Relations: ${team.relations?.length || 0}`);
      });
    }

    if (diagnostics.samples.departments.length > 0) {
      console.log(
        `\nDepartments (showing ${diagnostics.samples.departments.length} of ${diagnostics.counts.departments}):`
      );
      diagnostics.samples.departments.forEach((dept) => {
        console.log(`  - ${dept.title} (${dept.id})`);
        console.log(`    Relations: ${dept.relations?.length || 0}`);
      });
    }

    if (diagnostics.samples.roles.length > 0) {
      console.log(`\nRoles (showing ${diagnostics.samples.roles.length} of ${diagnostics.counts.roles}):`);
      diagnostics.samples.roles.forEach((role) => {
        console.log(`  - ${role.title} (${role.id})`);
        console.log(`    Relations: ${role.relations?.length || 0}`);
      });
    }

    console.log("\n=== FULL JSON ===");
    console.log(JSON.stringify(diagnostics, null, 2));
  } catch (error) {
    console.error("Failed to inspect org context", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});

