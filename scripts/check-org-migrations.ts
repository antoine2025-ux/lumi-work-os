#!/usr/bin/env tsx
/**
 * Org Module Migration Verification Script
 * 
 * This script checks which Org-related tables exist in the database.
 * Use this to verify migration status before merging Org into Loopwell 2.0.
 * 
 * Usage:
 *   npx tsx scripts/check-org-migrations.ts
 * 
 * Or with DATABASE_URL:
 *   DATABASE_URL="..." npx tsx scripts/check-org-migrations.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

interface TableStatus {
  exists: boolean
  rowCount?: number
  error?: string
}

async function checkTableExists(tableName: string): Promise<TableStatus> {
  try {
    // Try to query the table to see if it exists
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count FROM ${tableName} LIMIT 1`
    )
    return {
      exists: true,
      rowCount: Number(result[0]?.count || 0),
    }
  } catch (error: any) {
    // P2021 = table does not exist
    if (error.code === "P2021" || error.message?.includes("does not exist")) {
      return {
        exists: false,
        error: "Table does not exist",
      }
    }
    return {
      exists: false,
      error: error.message || "Unknown error",
    }
  }
}

async function main() {
  console.log("🔍 Checking Org module table migration status...\n")

  const tablesToCheck = [
    // Core structure (should exist)
    { name: "org_departments", required: true, description: "Core: Departments" },
    { name: "org_teams", required: true, description: "Core: Teams" },
    { name: "org_positions", required: true, description: "Core: Positions" },
    { name: "role_cards", required: true, description: "Core: Role Cards" },
    { name: "org_person_profile_overrides", required: true, description: "People: Profile Overrides" },
    { name: "org_audit_log", required: true, description: "Core: Audit Log" },
    { name: "org_saved_views", required: true, description: "Core: Saved Views" },
    
    // People models (should exist)
    { name: "person_availability", required: true, description: "People: Availability" },
    { name: "person_availability_health", required: false, description: "People: Availability Health" },
    { name: "person_capacity", required: false, description: "Capacity: Person Capacity" },
    { name: "capacity_allocations", required: false, description: "Capacity: Allocations" },
    { name: "project_allocations", required: false, description: "Capacity: Project Allocations" },
    { name: "person_role_assignments", required: false, description: "People: Role Assignments" },
    { name: "person_manager_links", required: false, description: "People: Manager Links" },
    
    // Ownership models (may not exist)
    { name: "owner_assignments", required: false, description: "Ownership: Assignments (defensively checked)" },
    { name: "domains", required: false, description: "Ownership: Domains" },
    { name: "system_entities", required: false, description: "Ownership: System Entities" },
    
    // Health models (should exist)
    { name: "org_health_snapshots", required: false, description: "Health: Snapshots" },
    { name: "org_health_signals", required: false, description: "Health: Signals" },
    
    // Legacy/Unused (documented but not used)
    { name: "orgs", required: false, description: "Legacy: Org model (NOT USED - workspaceId used instead)" },
    { name: "org_memberships", required: false, description: "Legacy: OrgMembership (NOT USED - WorkspaceMember used instead)" },
  ]

  const results: Array<{
    name: string
    required: boolean
    description: string
    status: TableStatus
  }> = []

  for (const table of tablesToCheck) {
    const status = await checkTableExists(table.name)
    results.push({
      name: table.name,
      required: table.required,
      description: table.description,
      status,
    })
  }

  // Print results
  console.log("=".repeat(80))
  console.log("MIGRATION STATUS REPORT")
  console.log("=".repeat(80))
  console.log()

  const requiredTables = results.filter((r) => r.required)
  const optionalTables = results.filter((r) => !r.required)

  console.log("📋 REQUIRED TABLES (should exist):")
  console.log("-".repeat(80))
  for (const result of requiredTables) {
    const icon = result.status.exists ? "✅" : "❌"
    const rowInfo = result.status.exists ? ` (${result.status.rowCount} rows)` : ""
    console.log(`${icon} ${result.name.padEnd(40)} ${result.description}${rowInfo}`)
    if (!result.status.exists && result.status.error) {
      console.log(`   └─ ${result.status.error}`)
    }
  }

  console.log()
  console.log("📋 OPTIONAL TABLES (may not exist):")
  console.log("-".repeat(80))
  for (const result of optionalTables) {
    const icon = result.status.exists ? "✅" : "⚪"
    const rowInfo = result.status.exists ? ` (${result.status.rowCount} rows)` : " (not migrated)"
    console.log(`${icon} ${result.name.padEnd(40)} ${result.description}${rowInfo}`)
  }

  console.log()
  console.log("=".repeat(80))
  console.log("SUMMARY")
  console.log("=".repeat(80))

  const missingRequired = requiredTables.filter((r) => !r.status.exists)
  const existingOptional = optionalTables.filter((r) => r.status.exists)

  if (missingRequired.length === 0) {
    console.log("✅ All required tables exist!")
  } else {
    console.log(`❌ Missing ${missingRequired.length} required table(s):`)
    for (const table of missingRequired) {
      console.log(`   - ${table.name} (${table.description})`)
    }
  }

  console.log()
  console.log(`📊 Optional tables present: ${existingOptional.length} of ${optionalTables.length}`)

  // Recommendations
  console.log()
  console.log("💡 RECOMMENDATIONS:")
  if (missingRequired.length > 0) {
    console.log("   ⚠️  Run migrations for missing required tables before merge")
  }
  if (existingOptional.length > 0) {
    console.log(`   ✅ ${existingOptional.length} optional table(s) are migrated (good!)`)
  }
  if (results.find((r) => r.name === "owner_assignments" && !r.status.exists)) {
    console.log("   ⚠️  owner_assignments table missing - ownership features should be feature-flagged")
  }
  if (results.find((r) => r.name === "person_capacity" && !r.status.exists)) {
    console.log("   ⚠️  person_capacity table missing - capacity features should be feature-flagged")
  }

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error("Error:", error)
  process.exit(1)
})

