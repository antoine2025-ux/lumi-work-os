import type { ReactNode } from 'react'

/**
 * Onboarding layout — clean full-width layout without sidebar, header, or navigation.
 * Used exclusively for the admin onboarding wizard.
 */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">{children}</div>
    </div>
  )
}
