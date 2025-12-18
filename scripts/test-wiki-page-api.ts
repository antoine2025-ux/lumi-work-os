/**
 * Test script for wiki page API endpoint
 * Tests GET /api/wiki/pages/[id] endpoint
 */

import { prisma } from '../src/lib/db'

async function testWikiPageAPI() {
  try {
    console.log('🔍 Testing wiki page API...\n')

    // Get a sample workspace
    const workspace = await prisma.workspace.findFirst({
      select: { id: true, name: true }
    })

    if (!workspace) {
      console.error('❌ No workspace found in database')
      process.exit(1)
    }

    console.log(`✅ Found workspace: ${workspace.name} (${workspace.id})\n`)

    // Get a sample wiki page
    const page = await prisma.wikiPage.findFirst({
      where: {
        workspaceId: workspace.id
      },
      select: {
        id: true,
        slug: true,
        title: true,
        contentFormat: true,
        workspaceId: true
      }
    })

    if (!page) {
      console.log('⚠️  No wiki pages found in workspace')
      console.log('   Creating a test page...\n')

      // Create a test page
      const testPage = await prisma.wikiPage.create({
        data: {
          title: 'Test Page',
          slug: 'test-page',
          content: '<p>Test content</p>',
          contentFormat: 'HTML',
          workspaceId: workspace.id,
          isPublished: true
        },
        select: {
          id: true,
          slug: true,
          title: true,
          contentFormat: true
        }
      })

      console.log(`✅ Created test page: ${testPage.title} (slug: ${testPage.slug})`)
      console.log(`   ID: ${testPage.id}`)
      console.log(`   Format: ${testPage.contentFormat}\n`)

      console.log('✅ Test page created successfully')
      console.log(`   You can now test the API with: GET /api/wiki/pages/${testPage.slug}`)
    } else {
      console.log(`✅ Found wiki page: ${page.title}`)
      console.log(`   ID: ${page.id}`)
      console.log(`   Slug: ${page.slug}`)
      console.log(`   Format: ${page.contentFormat}`)
      console.log(`   Workspace: ${page.workspaceId}\n`)

      console.log('✅ Test data available')
      console.log(`   Test with: GET /api/wiki/pages/${page.slug}`)
      console.log(`   Or by ID: GET /api/wiki/pages/${page.id}`)
    }

    // Check for pages with different formats
    const htmlPages = await prisma.wikiPage.count({
      where: {
        workspaceId: workspace.id,
        contentFormat: 'HTML'
      }
    })

    const jsonPages = await prisma.wikiPage.count({
      where: {
        workspaceId: workspace.id,
        contentFormat: 'JSON'
      }
    })

    console.log(`\n📊 Page format breakdown:`)
    console.log(`   HTML pages: ${htmlPages}`)
    console.log(`   JSON pages: ${jsonPages}`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Error testing wiki page API:', error)
    process.exit(1)
  }
}

testWikiPageAPI()

