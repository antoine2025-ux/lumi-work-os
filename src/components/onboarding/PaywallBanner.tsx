'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PaywallTier = 'trial' | 'business' | 'scale' | 'scale-plus' | 'enterprise'

interface PaywallBannerProps {
  tier: PaywallTier
  className?: string
}

const TIER_CONTENT: Record<
  PaywallTier,
  { icon: string; title: string; description: string; showContact?: boolean }
> = {
  trial: {
    icon: '\u2728',
    title: 'Your 14-day free trial starts now',
    description:
      'After your trial, upgrade to Pro (\u20AC29/month) or Pro+ (\u20AC49/month).',
  },
  business: {
    icon: '\uD83D\uDCCA',
    title: 'Business plan required',
    description:
      '\u20AC375/month for up to 15 seats, \u20AC20 per additional seat. You can continue setup and add payment later.',
  },
  scale: {
    icon: '\uD83D\uDCCA',
    title: 'Scale plan required',
    description:
      '\u20AC650/month for up to 30 seats, \u20AC18 per additional seat. You can continue setup and add payment later.',
  },
  'scale-plus': {
    icon: '\uD83D\uDCCA',
    title: 'Scale plan required',
    description:
      '\u20AC650/month for up to 30 seats, \u20AC18 per additional seat. Additional seats available beyond 30. You can continue setup and add payment later.',
  },
  enterprise: {
    icon: '\uD83C\uDFE2',
    title: 'Enterprise pricing',
    description: 'Custom pricing and dedicated support for teams of 50+.',
    showContact: true,
  },
}

export function PaywallBanner({ tier, className }: PaywallBannerProps) {
  const { icon, title, description, showContact } = TIER_CONTENT[tier]

  return (
    <Alert
      className={cn(
        'border-border/50 bg-muted/20 animate-in fade-in duration-300',
        className,
      )}
    >
      <AlertTitle className="flex items-center gap-2">
        <span className="text-lg" role="img" aria-hidden="true">
          {icon}
        </span>
        {title}
      </AlertTitle>
      <AlertDescription className="mt-1.5 pl-7">
        <p className="text-muted-foreground">{description}</p>
        {showContact && (
          <a
            href="mailto:sales@loopwell.io"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Mail className="h-3.5 w-3.5" />
            Contact sales
          </a>
        )}
      </AlertDescription>
    </Alert>
  )
}
