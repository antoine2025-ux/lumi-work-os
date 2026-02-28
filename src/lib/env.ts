import { z } from 'zod'

/**
 * Startup environment variable validator.
 *
 * - Production: fails fast with process.exit(1) on any missing/invalid required var.
 * - Development: warns to console but continues — local dev doesn't need all prod secrets.
 *
 * Source of truth: .env.production.example
 * DO NOT replace process.env usages elsewhere yet — this is additive only.
 */

const envSchema = z
  .object({
    // ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    // DIRECT_URL used by Prisma migrations (Supabase pgbouncer workaround)
    DIRECT_URL: z.string().min(1).optional(),

    // ── Authentication ────────────────────────────────────────────────────────
    NEXTAUTH_SECRET: z
      .string()
      .min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
    NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
    NEXT_PUBLIC_APP_URL: z
      .string()
      .url('NEXT_PUBLIC_APP_URL must be a valid URL')
      .optional(),
    APP_URL: z.string().url().optional(),

    // ── AI Providers (at least one required — enforced by .refine below) ──────
    OPENAI_API_KEY: z.string().startsWith('sk-').optional(),
    ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-').optional(),
    GOOGLE_API_KEY: z.string().optional(),

    // ── Loopbrain config ──────────────────────────────────────────────────────
    LOOPBRAIN_MODEL: z.string().optional(),
    LOOPBRAIN_ORG_MODEL: z.string().optional(),
    LOOPBRAIN_ORG_MAX_TOKENS: z.string().optional(),
    LOOPBRAIN_ORG_TIMEOUT_MS: z.string().optional(),
    LOOPBRAIN_ORG_ENABLED: z.string().optional(),

    // ── Supabase ──────────────────────────────────────────────────────────────
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().startsWith('eyJ').optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().startsWith('eyJ').optional(),

    // ── Slack (optional integration) ──────────────────────────────────────────
    SLACK_CLIENT_ID: z.string().optional(),
    SLACK_CLIENT_SECRET: z.string().optional(),
    SLACK_SIGNING_SECRET: z.string().optional(),
    SLACK_REDIRECT_URI: z.string().url().optional(),

    // ── Google Calendar (optional integration) ────────────────────────────────
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // ── Email (Resend) ────────────────────────────────────────────────────────
    RESEND_API_KEY: z.string().startsWith('re_').optional(),
    EMAIL_FROM: z.string().email().optional(),
    MAIL_FROM: z.string().email().optional(),

    // ── Redis (optional — app degrades gracefully without it) ─────────────────
    REDIS_URL: z.string().optional(),

    // ── Feature flags ─────────────────────────────────────────────────────────
    NEXT_PUBLIC_ENABLE_ASSISTANT: z.string().optional(),
    NEXT_PUBLIC_ENABLE_SOCKET_IO: z.string().optional(),
    ORG_CONTEXT_NIGHTLY_ENABLED: z.string().optional(),
    ORG_CONTEXT_NIGHTLY_CRON: z.string().optional(),
    PRISMA_WORKSPACE_SCOPING_ENABLED: z.string().optional(),
    API_VERBOSE_LOGGING: z.string().optional(),

    // ── Internal / cron secrets ───────────────────────────────────────────────
    CRON_SECRET: z.string().optional(),
    LOOPBRAIN_CRON_SECRET: z.string().optional(),

    // ── Blog admin (optional) ─────────────────────────────────────────────────
    BLOG_ADMIN_PASSWORD: z.string().optional(),

    // ── Mailchimp (optional marketing) ───────────────────────────────────────
    MAILCHIMP_API_KEY: z.string().optional(),
    MAILCHIMP_LIST_ID: z.string().optional(),

    // ── Sentry (optional — error monitoring) ─────────────────────────────────
    // DSN is NEXT_PUBLIC_ so it reaches the browser bundle too
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),
    // Auth token used only at build time for source map uploads
    SENTRY_AUTH_TOKEN: z.string().optional(),
  })
  .refine(
    (data) => !!(data.OPENAI_API_KEY || data.ANTHROPIC_API_KEY),
    {
      message:
        'At least one AI provider key required (OPENAI_API_KEY or ANTHROPIC_API_KEY)',
      path: ['OPENAI_API_KEY'],
    }
  )

export type EnvConfig = z.infer<typeof envSchema>

function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('❌ Invalid environment variables:')
    console.error(result.error.flatten().fieldErrors)

    // Fail fast at production runtime only.
    // NEXT_PHASE='phase-production-build' during `next build` — skip exit there,
    // since build-time env differs from deployed runtime env.
    const isProductionRuntime =
      process.env.NODE_ENV === 'production' &&
      process.env.NEXT_PHASE !== 'phase-production-build'

    if (isProductionRuntime) {
      process.exit(1)
    }
  }

  // In development/build: cast and continue so missing prod secrets don't block work
  return result.success ? result.data : (process.env as unknown as EnvConfig)
}

export const env = validateEnv()
