"use client"

import { ThemeProvider } from "next-themes"

function LandingThemeWrapper({ children }: { children: React.ReactNode}) {
  return (
    <div className="landing-theme" suppressHydrationWarning>
      {children}
    </div>
  )
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={true}
      storageKey="landing-theme"
      disableTransitionOnChange={false}
    >
      <LandingThemeWrapper>{children}</LandingThemeWrapper>
    </ThemeProvider>
  )
}
