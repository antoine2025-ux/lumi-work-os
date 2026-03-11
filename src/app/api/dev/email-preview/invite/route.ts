import { NextResponse } from 'next/server'
import { buildInviteHtml } from '@/lib/email/send-invite'

/** Dev-only: preview invite email HTML in browser. Visit /api/dev/email-preview/invite */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Preview only available in development' }, { status: 404 })
  }

  const html = buildInviteHtml({
    workspaceName: 'Acme Corp',
    inviterName: 'Jane Smith',
    inviteLink: 'http://localhost:3000/invite/sample-token',
    role: 'EDITOR',
  })

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
