// Dynamic import to avoid breaking if resend is not installed
let Resend: any;
try {
  Resend = require("resend").Resend;
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

  const resend = new Resend(process.env.RESEND_API_KEY);

  const from = process.env.MAIL_FROM || "Loopwell <no-reply@loopwell.ai>";
  const result = await resend.emails.send({
    from,
    to: args.to,
    subject: args.subject,
    html: args.html,
  });

  return { ok: true, provider: "resend", id: (result as any)?.id };
}
