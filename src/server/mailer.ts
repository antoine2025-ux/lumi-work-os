// Dynamic import to avoid breaking if resend is not installed
type ResendClient = { emails: { send: (args: Record<string, unknown>) => Promise<{ id?: string }> } }
type ResendConstructor = new (apiKey: string) => ResendClient
let Resend: ResendConstructor | undefined
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Resend = require("resend").Resend as ResendConstructor
} catch {
  // Resend not installed, will use fallback
}

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
};

function isConfigured() {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail(args: SendEmailArgs) {
  if (!isConfigured() || !Resend) {
    console.log("[MAILER:DEV-FALLBACK]", { to: args.to, subject: args.subject });
    return { ok: true, provider: "dev-fallback" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY!);

  const from = process.env.MAIL_FROM || "Loopwell <no-reply@loopwell.ai>";
  const result = await resend.emails.send({
    from,
    to: args.to,
    subject: args.subject,
    html: args.html,
  });

  return { ok: true, provider: "resend", id: result?.id };
}
