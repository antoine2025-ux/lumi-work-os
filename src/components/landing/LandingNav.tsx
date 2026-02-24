"use client"

import { LandingLogo } from "@/components/landing/LandingLogo"
import { ThemeToggle } from "@/components/landing/ThemeToggle"
import {
  LayoutDashboard,
  FolderOpen,
  Users as UsersIcon,
  Sparkles,
  ChevronDown,
  Menu,
  X,
} from "lucide-react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { signIn } from "next-auth/react"

const PRODUCT_ITEMS = [
  { icon: LayoutDashboard, name: "Dashboard",  description: "Your command center",        href: "/#dashboard-section"  },
  { icon: FolderOpen,      name: "Spaces",     description: "Projects and documentation", href: "/#spaces-section"     },
  { icon: UsersIcon,       name: "Org",        description: "People and capacity",         href: "/#org-section"        },
  { icon: Sparkles,        name: "Loopbrain",  description: "AI that acts",               href: "/#loopbrain-section"  },
]

function ProductDropdown() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button className="flex items-center gap-1 text-sm text-landing-text-secondary hover:text-landing-text transition-colors py-2">
        Product
        <ChevronDown
          className={cn("w-3.5 h-3.5 transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 w-72 rounded-xl border border-landing-border bg-landing-surface shadow-xl overflow-hidden z-50"
          >
            <div className="p-2">
              <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-landing-text-muted font-medium">
                Platform
              </p>
              {PRODUCT_ITEMS.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-landing-surface-elevated transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-landing-accent/10 flex items-center justify-center shrink-0 group-hover:bg-landing-accent/20 transition-colors mt-0.5">
                    <item.icon className="w-3.5 h-3.5 text-landing-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-landing-text">{item.name}</p>
                    <p className="text-xs text-landing-text-muted">{item.description}</p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="border-t border-landing-border p-2">
              <Link
                href="/#how-it-works-section"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-landing-text-secondary hover:text-landing-text hover:bg-landing-surface-elevated transition-colors"
              >
                <span>See how it works</span>
                <span className="text-landing-accent">→</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PricingLink() {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button className="text-sm text-landing-text-secondary hover:text-landing-text transition-colors py-2 cursor-default">
        Pricing
      </button>

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 rounded-lg bg-landing-text text-landing-bg text-xs whitespace-nowrap z-50"
          >
            Coming soon
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-landing-text rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function LoginDropdown() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button className="text-sm text-landing-text-secondary hover:text-landing-text transition-colors py-2">
        Login
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-1 w-56 rounded-xl border border-landing-border bg-landing-surface shadow-xl overflow-hidden z-50"
          >
            <div className="p-2">
              <button
                onClick={() => signIn("google", { callbackUrl: "/home" })}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-landing-surface-elevated transition-colors group"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="text-sm font-medium text-landing-text">Continue with Google</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function LandingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="border-b border-landing-border bg-landing-surface/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <LandingLogo width={28} height={28} className="w-7 h-7" />
            <span className="text-lg font-semibold text-landing-text">Loopwell</span>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <ProductDropdown />
            <PricingLink />
            <LoginDropdown />
            <ThemeToggle />
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-landing-text" />
            ) : (
              <Menu className="w-5 h-5 text-landing-text" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-landing-border bg-landing-surface py-4 w-full">
            <div className="flex flex-col space-y-1 px-2 w-full">
              <p className="text-[10px] uppercase tracking-wider text-landing-text-muted font-medium px-2 pt-1 pb-0.5">Product</p>
              {PRODUCT_ITEMS.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-sm text-landing-text-secondary hover:text-landing-text transition-colors py-1.5 px-2 rounded-md hover:bg-landing-surface-elevated w-full"
                >
                  <item.icon className="w-3.5 h-3.5 text-landing-text-muted shrink-0" />
                  {item.name}
                </Link>
              ))}
              <Link
                href="/#how-it-works-section"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-sm text-landing-text-secondary hover:text-landing-text transition-colors py-1.5 px-2 rounded-md hover:bg-landing-surface-elevated w-full"
              >
                <span>See how it works</span>
                <span className="text-landing-accent">→</span>
              </Link>
              <div className="border-t border-landing-border/50 my-2" />
              <div className="px-2 py-1 text-sm text-landing-text-muted cursor-default select-none flex items-center justify-between">
                <span>Pricing</span>
                <span className="text-[10px] bg-landing-surface-elevated px-2 py-0.5 rounded text-landing-text-muted">Coming soon</span>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  signIn("google", { callbackUrl: "/home" })
                }}
                className="text-sm text-landing-text-secondary hover:text-landing-text transition-colors py-1.5 px-2 text-left w-full rounded-md hover:bg-landing-surface-elevated"
              >
                Login with Google
              </button>
              <div className="flex items-center justify-between py-1 px-2">
                <span className="text-sm text-landing-text-secondary">Theme</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
