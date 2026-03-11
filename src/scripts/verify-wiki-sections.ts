import { prisma } from '@/lib/db'

async function verifyWikiSections() {
  console.log('Verifying wiki sections implementation...\n')
  
  // Check if isSection field exists by querying
  try {
    const sectionsCount = await prisma.wikiPage.count({
      where: { isSection: true }
    })
    console.log(`✓ isSection field exists in database`)
    console.log(`  Found ${sectionsCount} pages marked as sections\n`)
    
    // Get some example sections
    const sections = await prisma.wikiPage.findMany({
      where: { isSection: true },
      select: {
        id: true,
        title: true,
        isSection: true,
        parentId: true,
        _count: { select: { children: true } }
      },
      take: 5
    })
    
    if (sections.length > 0) {
      console.log('Example sections:')
      sections.forEach(section => {
        console.log(`  - ${section.title} (isSection: ${section.isSection}, children: ${section._count.children})`)
      })
    }
    
    // Check regular pages
    const pagesCount = await prisma.wikiPage.count({
      where: { isSection: false }
    })
    console.log(`\n✓ Found ${pagesCount} regular pages (isSection: false)`)
    
    console.log('\n✅ All verification checks passed!')
    
  } catch (error: unknown) {
    console.error('❌ Verification failed:', error)
    process.exit(1)
  }
}

verifyWikiSections()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
