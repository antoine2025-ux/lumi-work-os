import { prisma } from '@/lib/db'
import { MigrationSource, MigrationItem, MigrationProgress, MigrationResult } from './types'

export class MigrationService {
  private workspaceId: string
  private userId: string

  constructor(workspaceId: string, userId: string) {
    this.workspaceId = workspaceId
    this.userId = userId
  }

  async startMigration(source: MigrationSource): Promise<MigrationProgress> {
    // Create migration record
    const migration = await prisma.integration.create({
      data: {
        workspaceId: this.workspaceId,
        type: source.platform.toUpperCase() as any,
        name: `${source.platform} Migration`,
        config: {
          source,
          status: 'in_progress',
          progress: {
            total: 0,
            completed: 0,
            failed: 0,
            status: 'pending'
          }
        },
        isActive: true
      }
    })

    return {
      total: 0,
      completed: 0,
      failed: 0,
      status: 'pending',
      errors: []
    }
  }

  async migrateItems(items: MigrationItem[]): Promise<MigrationResult> {
    const results: MigrationResult = {
      success: true,
      importedCount: 0,
      failedCount: 0,
      errors: [],
      importedItems: []
    }

    for (const item of items) {
      try {
        // Create wiki page from migrated item
        const page = await prisma.wikiPage.create({
          data: {
            workspaceId: this.workspaceId,
            title: item.title,
            slug: this.generateSlug(item.title),
            content: item.content,
            excerpt: this.generateExcerpt(item.content),
            createdById: this.userId,
            tags: item.metadata.tags || [],
            category: item.metadata.category || 'migrated',
            parentId: item.metadata.parentId ? await this.findParentPage(item.metadata.parentId) : null
          }
        })

        // Create version history
        await prisma.wikiVersion.create({
          data: {
            pageId: page.id,
            content: item.content,
            version: 1,
            createdById: this.userId
          }
        })

        // Handle attachments if any
        if (item.metadata.attachments?.length) {
          for (const attachment of item.metadata.attachments) {
            await prisma.wikiAttachment.create({
              data: {
                pageId: page.id,
                fileName: attachment.name,
                fileSize: attachment.size,
                fileType: attachment.type,
                fileUrl: attachment.url
              }
            })
          }
        }

        results.importedCount++
        results.importedItems.push(page.id)

      } catch (error) {
        results.failedCount++
        results.errors.push(`Failed to import "${item.title}": ${error.message}`)
        console.error(`Migration error for item ${item.id}:`, error)
      }
    }

    results.success = results.failedCount === 0
    return results
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  private generateExcerpt(content: string): string {
    const plainText = content.replace(/<[^>]*>/g, '').replace(/\n+/g, ' ')
    return plainText.substring(0, 200) + (plainText.length > 200 ? '...' : '')
  }

  private async findParentPage(originalParentId: string): Promise<string | null> {
    // This would need to be implemented based on how we track original IDs
    // For now, return null
    return null
  }
}
