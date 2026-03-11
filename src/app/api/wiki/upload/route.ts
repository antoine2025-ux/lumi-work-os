import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import {
  WIKI_UPLOAD_ALLOWED_MIME,
  WIKI_UPLOAD_MAX_SIZE,
} from '@/lib/validations/wiki'
import { randomUUID } from 'crypto'

const BUCKET_NAME = 'wiki-attachments'

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  return Boolean(url && key && key.startsWith('eyJ'))
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 200)
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)

    if (!auth.workspaceId) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 400 })
    }

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const formData = await request.formData()
    const file = formData.get('file')
    const pageIdRaw = formData.get('pageId')

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided. Send a file in the "file" field.' },
        { status: 400 }
      )
    }

    const pageId =
      typeof pageIdRaw === 'string' && pageIdRaw.trim()
        ? pageIdRaw.trim()
        : null

    // Validate file size
    if (file.size > WIKI_UPLOAD_MAX_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${WIKI_UPLOAD_MAX_SIZE / 1024 / 1024}MB.`,
        },
        { status: 400 }
      )
    }

    // Validate MIME type
    const mimeType = file.type || 'application/octet-stream'
    if (!WIKI_UPLOAD_ALLOWED_MIME.includes(mimeType as (typeof WIKI_UPLOAD_ALLOWED_MIME)[number])) {
      return NextResponse.json(
        {
          error: `File type not allowed. Allowed: ${WIKI_UPLOAD_ALLOWED_MIME.join(', ')}`,
        },
        { status: 400 }
      )
    }

    let fileUrl: string

    if (isSupabaseConfigured()) {
      try {
        const { getSupabaseAdmin } = await import('@/lib/supabase/admin')
        const supabase = getSupabaseAdmin()

        const ext = file.name.split('.').pop() || 'bin'
        const safeName = sanitizeFilename(file.name)
        const path = `${auth.workspaceId}/${randomUUID()}-${safeName}`

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(path, buffer, {
            contentType: mimeType,
            upsert: false,
          })

        if (error) {
          console.error('Supabase storage upload error:', error)
          throw new Error(`Storage upload failed: ${error.message}`)
        }

        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(data.path)

        fileUrl = urlData.publicUrl
      } catch (storageError) {
        console.error('Supabase storage error, falling back to base64:', storageError)
        // Fallback to base64
        const arrayBuffer = await file.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        fileUrl = `data:${mimeType};base64,${base64}`
      }
    } else {
      // No Supabase: store as base64 data URL
      const arrayBuffer = await file.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      fileUrl = `data:${mimeType};base64,${base64}`
    }

    const attachment = await prisma.wikiAttachment.create({
      data: {
        workspaceId: auth.workspaceId,
        pageId,
        fileName: file.name,
        fileSize: file.size,
        fileType: mimeType,
        fileUrl,
      },
    })

    return NextResponse.json({
      url: fileUrl,
      filename: file.name,
      size: file.size,
      mimeType,
      attachmentId: attachment.id,
    })
  } catch (error: unknown) {
    console.error('Wiki upload error:', error)
    return handleApiError(error, request)
  }
}
