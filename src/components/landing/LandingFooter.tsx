import Link from "next/link"
import { LandingLogo } from "@/components/landing/LandingLogo"
import { NewsletterSignup } from "@/components/landing/newsletter-signup"

export function LandingFooter() {
  return (
    <footer className="border-t border-landing-border bg-landing-bg-footer">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Brand Column */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <LandingLogo width={24} height={24} className="w-6 h-6" />
              <span className="font-semibold text-landing-text">Loopwell</span>
            </Link>
            <p className="text-sm text-landing-text-secondary mb-6">
              One workspace. One brain. Full stop.
            </p>
            <NewsletterSignup />
          </div>

          {/* Product Column */}
          <div>
            <h3 className="font-medium text-landing-text mb-4">Product</h3>
            <ul className="space-y-3">
              <li><Link href="/#dashboard-section" className="text-sm text-landing-text-secondary hover:text-landing-text transition-colors">Dashboard</Link></li>
              <li><Link href="/#spaces-section" className="text-sm text-landing-text-secondary hover:text-landing-text transition-colors">Spaces</Link></li>
              <li><Link href="/#org-section" className="text-sm text-landing-text-secondary hover:text-landing-text transition-colors">Org</Link></li>
              <li><Link href="/#loopbrain-section" className="text-sm text-landing-text-secondary hover:text-landing-text transition-colors">Loopbrain</Link></li>
              <li><Link href="/#how-it-works-section" className="text-sm text-landing-text-secondary hover:text-landing-text transition-colors">How it works</Link></li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h3 className="font-medium text-landing-text mb-4">Company</h3>
            <ul className="space-y-3">
              <li><a href="/about" className="text-sm text-landing-text-secondary hover:text-landing-text transition-colors">About</a></li>
              <li><a href="mailto:hello@loopwell.io" className="text-sm text-landing-text-secondary hover:text-landing-text transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="font-medium text-landing-text mb-4">Legal</h3>
            <ul className="space-y-3">
              <li><a href="/privacy" className="text-sm text-landing-text-secondary hover:text-landing-text transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="text-sm text-landing-text-secondary hover:text-landing-text transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-landing-border">
          <p className="text-sm text-landing-text-muted">
            &copy; 2026 Loopwell. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
