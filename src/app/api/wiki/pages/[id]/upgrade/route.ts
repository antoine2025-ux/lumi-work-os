import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { convertHtmlToTipTap } from '@/lib/wiki/html-to-tiptap'
import { extractTextFromProseMirror } from '@/lib/wiki/text-extract'
import { logger } from '@/lib/logger'

/**
 * POST /api/wiki/pages/[id]/upgrade
 * 
 * Upgrades a legacy HTML page to JSON format (TipTap/ProseMirror)
 * This is the ONLY allowed path to switch formats from HTML → JSON
 * 
 * Behavior:
 * - Loads page by id
 * - Verifies page is HTML format
 * - Converts HTML to TipTap JSON
 * - Updates page with JSON format
 * - Creates version snapshot
 * - Returns updated page
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    
    if (!auth.workspaceId) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 400 })
    }
    
    // Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)
    
    const resolvedParams = await params
    const pageId = resolvedParams.id

    logger.info('Upgrading wiki page', { pageId, workspaceId: auth.workspaceId })

    // Load page
    const page = await (prisma.wikiPage.findUnique as Function)({
      where: { id: pageId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1
        }
      }
    }) as {
      id: string
      workspaceId: string
      content: string | null
      contentFormat: string | null
      versions: Array<{ id: string; content: string; version: number }>
    } | null

    if (!page) {
      logger.warn('Page not found for upgrade', { pageId })
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // Verify workspace access
    if (page.workspaceId !== auth.workspaceId) {
      logger.warn('Workspace mismatch on upgrade', { pageId, pageWorkspaceId: page.workspaceId, authWorkspaceId: auth.workspaceId })
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify page is HTML format
    if (page.contentFormat !== 'HTML') {
      logger.info('Page already upgraded', { pageId, contentFormat: page.contentFormat })
      return NextResponse.json({ 
        error: 'Page is already upgraded to JSON format',
        contentFormat: page.contentFormat
      }, { status: 400 })
    }

    // Convert HTML to TipTap JSON
    const htmlContent = page.content || ''
    let conversionResult
    
    try {
      conversionResult = convertHtmlToTipTap(htmlContent)
    } catch (error: unknown) {
      logger.error('HTML conversion failed', { pageId, error: error instanceof Error ? error.message : String(error) })
      return NextResponse.json({ 
        error: 'Failed to convert HTML to JSON format',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 422 })
    }

    // Validate conversion result
    if (!conversionResult.doc || conversionResult.doc.type !== 'doc') {
      logger.error('Invalid conversion result', { pageId })
      return NextResponse.json({ 
        error: 'Conversion produced invalid document structure'
      }, { status: 422 })
    }

    // Extract text content from converted JSON
    const textContent = extractTextFromProseMirror(conversionResult.doc)
    const excerpt = textContent ? textContent.substring(0, 200) + (textContent.length > 200 ? '...' : '') : null

    // Log warnings if any
    if (conversionResult.warnings.length > 0) {
      logger.warn('HTML conversion warnings', { 
        pageId, 
        warnings: conversionResult.warnings,
        warningCount: conversionResult.warnings.length
      })
      console.warn(`[Upgrade] Page ${pageId} conversion warnings:`, conversionResult.warnings)
    }

    // Calculate next version number
    const nextVersion = (page.versions[0]?.version || 0) + 1

    // Wrap page update + version create in a transaction for atomicity
    const updatedPage = await prisma.$transaction(async (tx) => {
      // Update page with JSON format
      // Preserve original HTML in content field (do not modify)
      const updated = await (tx.wikiPage.update as Function)({
        where: { id: pageId },
        data: {
          contentJson: conversionResult.doc as any, // Prisma Json type
          contentFormat: 'JSON',
          textContent: textContent || null,
          excerpt: excerpt || null
          // content field remains unchanged (preserves HTML)
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }) as {
        id: string
        title: string
        slug: string
        contentFormat: string
        updatedAt: Date
        createdBy: { id: string; name: string | null; email: string } | null
      }

      // Create version snapshot with JSON format
      await (tx.wikiVersion.create as Function)({
        data: {
          pageId: pageId,
          content: JSON.stringify(conversionResult.doc), // Store JSON as string in content field
          contentJson: conversionResult.doc as any,
          contentFormat: 'JSON',
          textContent: textContent || null,
          version: nextVersion,
          createdById: auth.user.userId,
          workspaceId: auth.workspaceId
        }
      })

      return updated
    })

    logger.info('Page upgraded successfully', { 
      pageId, 
      warnings: conversionResult.warnings.length,
      version: nextVersion
    })

    // Return updated page (minimal fields) with warnings if any
    return NextResponse.json({
      id: updatedPage.id,
      title: updatedPage.title,
      slug: updatedPage.slug,
      contentFormat: updatedPage.contentFormat,
      updatedAt: updatedPage.updatedAt,
      warnings: conversionResult.warnings.length > 0 ? conversionResult.warnings : undefined
    })

  } catch (error: unknown) {
    logger.error('Error upgrading wiki page', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return handleApiError(error)
  }
}

