import { resend, EMAIL_FROM } from './resend'
import { getAppBaseUrl } from '@/lib/appUrl'

interface SendInviteParams {
  to: string
  workspaceName: string
  inviterName: string
  inviteToken: string
  role: string
}

export function buildInviteHtml({
  workspaceName,
  inviterName,
  inviteLink,
  role,
}: {
  workspaceName: string
  inviterName: string
  inviteLink: string
  role: string
}): string {
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; padding: 40px 20px; background-color: #f9fafb;">
      <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h1 style="color: #1a1a2e; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">
          You&apos;ve been invited to join ${workspaceName} on Loopwell.
        </h1>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
          Loopwell brings your team&apos;s projects, docs, and knowledge together, with your own agent that understands your organization. Manage work, find answers, and stay aligned in one place.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${inviteLink}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 14px; margin: 32px 0 0 0;">
          This invitation will expire in 14 days. If you didn&apos;t expect this email, you can safely ignore it.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
        <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
          Loopwell &mdash; Projects, docs & AI that knows your org
        </p>
      </div>
    </div>
  `
}

export async function sendWorkspaceInvite({
  to,
  workspaceName,
  inviterName,
  inviteToken,
  role,
}: SendInviteParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const baseUrl = getAppBaseUrl()
  const inviteLink = `${baseUrl}/invite/${inviteToken}`

  if (!resend) {
    console.log('📧 [DEV MODE] Would send invite email:')
    console.log('   To:', to)
    console.log('   Workspace:', workspaceName)
    console.log('   Inviter:', inviterName)
    console.log('   Role:', role)
    console.log('   Link:', inviteLink)
    return { success: true, messageId: 'dev-mode' }
  }

  try {
    const html = buildInviteHtml({ workspaceName, inviterName, inviteLink, role })

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `You've been invited to join ${workspaceName} on Loopwell`,
      html,
    })

    if (error) {
      console.error('Failed to send invite email:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Invite email sent:', data?.id)
    return { success: true, messageId: data?.id }
  } catch (err) {
    console.error('Email send error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send email',
    }
  }
}
