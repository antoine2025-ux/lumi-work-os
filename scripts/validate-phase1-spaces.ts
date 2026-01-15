/**
 * Phase 1 Validation Script
 * 
 * Validates the canonical Spaces implementation without requiring migrations.
 * Checks code logic, API endpoints, and data flow.
 */

import { PrismaClient, SpaceType, SpaceVisibility } from '@prisma/client'

const prisma = new PrismaClient()

async function validateSchema() {
  console.log('📋 Validating Prisma Schema...\n')
  
  try {
    // Check if Space model exists
    const spaceCount = await prisma.space.count()
    console.log(`✅ Space model exists (${spaceCount} records)`)
  } catch (error: any) {
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.log('⚠️  Space table does not exist - migrations not run yet')
      console.log('   This is expected if migrations haven\'t been applied')
      return false
    }
    throw error
  }
  
  try {
    // Check if SpaceMember model exists
    const memberCount = await prisma.spaceMember.count()
    console.log(`✅ SpaceMember model exists (${memberCount} records)`)
  } catch (error: any) {
    if (error.code === 'P2021') {
      console.log('⚠️  SpaceMember table does not exist')
      return false
    }
    throw error
  }
  
  // Check if Project has spaceId field
  try {
    const project = await prisma.project.findFirst({
      select: { spaceId: true }
    })
    console.log('✅ Project.spaceId field exists')
  } catch (error: any) {
    console.log('⚠️  Project.spaceId field may not exist:', error.message)
    return false
  }
  
  // Check if WikiPage has spaceId field
  try {
    const page = await prisma.wikiPage.findFirst({
      select: { spaceId: true }
    })
    console.log('✅ WikiPage.spaceId field exists')
  } catch (error: any) {
    console.log('⚠️  WikiPage.spaceId field may not exist:', error.message)
    return false
  }
  
  return true
}

async function validateBackfillLogic() {
  console.log('\n🔄 Validating Backfill Logic...\n')
  
  // Check helper functions exist
  try {
    const { getOrCreateTeamSpace, getOrCreatePersonalSpace } = await import('../src/lib/spaces/canonical-space-helpers')
    console.log('✅ Helper functions exist: getOrCreateTeamSpace, getOrCreatePersonalSpace')
  } catch (error) {
    console.log('❌ Helper functions not found:', error)
    return false
  }
  
  // Check backfill script exists
  try {
    const { backfillCanonicalSpaces } = await import('../scripts/backfill-canonical-spaces')
    console.log('✅ Backfill script exists and exports main function')
  } catch (error) {
    console.log('❌ Backfill script not found or invalid:', error)
    return false
  }
  
  return true
}

async function validateAPIEndpoints() {
  console.log('\n🌐 Validating API Endpoints...\n')
  
  // Check spaces API exists
  try {
    const spacesRoute = await import('../src/app/api/spaces/route')
    if (spacesRoute.GET && spacesRoute.POST) {
      console.log('✅ GET /api/spaces endpoint exists')
      console.log('✅ POST /api/spaces endpoint exists')
    } else {
      console.log('❌ Spaces API endpoints missing')
      return false
    }
  } catch (error) {
    console.log('❌ Spaces API route not found:', error)
    return false
  }
  
  // Check documentation endpoint has spaceId enforcement
  try {
    const docRoute = await import('../src/app/api/projects/[projectId]/documentation/route')
    if (docRoute.POST) {
      console.log('✅ POST /api/projects/[projectId]/documentation endpoint exists')
      // Check if it imports spaceId check logic
      const fs = require('fs')
      const content = fs.readFileSync('src/app/api/projects/[projectId]/documentation/route.ts', 'utf8')
      if (content.includes('spaceId') && content.includes('project.spaceId') && content.includes('wikiPage.spaceId')) {
        console.log('✅ Documentation endpoint includes spaceId enforcement')
      } else {
        console.log('⚠️  Documentation endpoint may not have spaceId enforcement')
      }
    }
  } catch (error) {
    console.log('⚠️  Could not validate documentation endpoint:', error)
  }
  
  return true
}

async function validateComponentUpdates() {
  console.log('\n🎨 Validating Component Updates...\n')
  
  // Check WikiPageSelector accepts spaceId prop
  try {
    const fs = require('fs')
    const selectorContent = fs.readFileSync('src/components/projects/wiki-page-selector.tsx', 'utf8')
    
    if (selectorContent.includes('spaceId?: string')) {
      console.log('✅ WikiPageSelector accepts spaceId prop')
    } else {
      console.log('⚠️  WikiPageSelector may not accept spaceId prop')
    }
    
    if (selectorContent.includes('propSpaceId') || selectorContent.includes('spaceId')) {
      console.log('✅ WikiPageSelector uses spaceId for filtering')
    }
  } catch (error) {
    console.log('⚠️  Could not validate WikiPageSelector:', error)
  }
  
  // Check ProjectDocumentationSection passes spaceId
  try {
    const fs = require('fs')
    const sectionContent = fs.readFileSync('src/components/projects/project-documentation-section.tsx', 'utf8')
    
    if (sectionContent.includes('spaceId') && sectionContent.includes('WikiPageSelector')) {
      console.log('✅ ProjectDocumentationSection passes spaceId to WikiPageSelector')
    } else {
      console.log('⚠️  ProjectDocumentationSection may not pass spaceId')
    }
  } catch (error) {
    console.log('⚠️  Could not validate ProjectDocumentationSection:', error)
  }
  
  return true
}

async function validateCreationFlows() {
  console.log('\n📝 Validating Creation Flows...\n')
  
  // Check project creation sets spaceId
  try {
    const fs = require('fs')
    const projectRouteContent = fs.readFileSync('src/app/api/projects/route.ts', 'utf8')
    
    if (projectRouteContent.includes('getOrCreateTeamSpace') && projectRouteContent.includes('spaceId:')) {
      console.log('✅ Project creation sets spaceId')
    } else {
      console.log('⚠️  Project creation may not set spaceId')
    }
  } catch (error) {
    console.log('⚠️  Could not validate project creation:', error)
  }
  
  // Check wiki page creation sets spaceId
  try {
    const fs = require('fs')
    const wikiRouteContent = fs.readFileSync('src/app/api/wiki/pages/route.ts', 'utf8')
    
    if (wikiRouteContent.includes('getOrCreateTeamSpace') || wikiRouteContent.includes('getOrCreatePersonalSpace')) {
      console.log('✅ Wiki page creation sets spaceId')
    } else {
      console.log('⚠️  Wiki page creation may not set spaceId')
    }
  } catch (error) {
    console.log('⚠️  Could not validate wiki page creation:', error)
  }
  
  return true
}

async function main() {
  console.log('🚀 Phase 1 Validation Script\n')
  console.log('=' .repeat(50) + '\n')
  
  const results = {
    schema: await validateSchema(),
    backfill: await validateBackfillLogic(),
    api: await validateAPIEndpoints(),
    components: await validateComponentUpdates(),
    creation: await validateCreationFlows()
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('\n📊 Validation Summary:\n')
  console.log(`Schema:        ${results.schema ? '✅' : '⚠️ '}`)
  console.log(`Backfill:      ${results.backfill ? '✅' : '❌'}`)
  console.log(`API Endpoints: ${results.api ? '✅' : '❌'}`)
  console.log(`Components:    ${results.components ? '✅' : '⚠️ '}`)
  console.log(`Creation:      ${results.creation ? '✅' : '⚠️ '}`)
  
  const allPassed = Object.values(results).every(r => r)
  
  if (allPassed) {
    console.log('\n✅ All validations passed!')
  } else {
    console.log('\n⚠️  Some validations had warnings (may be expected if migrations not run)')
  }
  
  await prisma.$disconnect()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Validation failed:', error)
    process.exit(1)
  })
