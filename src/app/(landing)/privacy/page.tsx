import { LandingNav } from "@/components/landing/LandingNav"
import { LandingFooter } from "@/components/landing/LandingFooter"

export const metadata = {
  title: "Privacy Policy | Loopwell",
  description: "How Loopwell collects, uses, and protects your data.",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-landing-bg transition-colors duration-300 overflow-x-hidden">
      <LandingNav />

      <main>
        <article className="max-w-3xl mx-auto px-4 md:px-6 py-16 md:py-24 lg:py-32">
          <header className="mb-12">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-semibold text-landing-text mb-4">
              Privacy Policy
            </h1>
            <p className="text-landing-text-muted">Last updated: February 2026</p>
          </header>

          <div className="prose-landing space-y-8 text-landing-text-secondary leading-relaxed">

            <section>
              <p>
                Loopwell Intelligence OÜ (&ldquo;Loopwell,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform at loopwell.io (the &ldquo;Service&rdquo;).
              </p>
              <p>
                We are based in Estonia and comply with the General Data Protection Regulation (GDPR) and other applicable data protection laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                Information We Collect
              </h2>

              <h3 className="text-lg font-medium text-landing-text mt-6 mb-3">
                Information you provide
              </h3>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><strong className="text-landing-text">Account information:</strong> Name, email address, password, and profile details when you create an account.</li>
                <li><strong className="text-landing-text">Workspace data:</strong> Organization name, team structure, departments, roles, and capacity information you configure.</li>
                <li><strong className="text-landing-text">Content:</strong> Projects, tasks, documents, wiki pages, goals, and other content you create within the Service.</li>
                <li><strong className="text-landing-text">Communications:</strong> Messages you send through Loopbrain, feedback, and support requests.</li>
              </ul>

              <h3 className="text-lg font-medium text-landing-text mt-6 mb-3">
                Information collected automatically
              </h3>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><strong className="text-landing-text">Usage data:</strong> How you interact with the Service, features used, and actions taken.</li>
                <li><strong className="text-landing-text">Device information:</strong> Browser type, operating system, and device identifiers.</li>
                <li><strong className="text-landing-text">Log data:</strong> IP address, access times, and pages viewed.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                How We Use Your Information
              </h2>
              <p>We use your information to:</p>
              <ul className="list-disc list-outside ml-5 space-y-2 mt-3">
                <li>Provide, maintain, and improve the Service</li>
                <li>Power Loopbrain&apos;s AI features with your organizational context</li>
                <li>Process your requests and respond to inquiries</li>
                <li>Send service-related communications and updates</li>
                <li>Analyze usage patterns to improve the Service</li>
                <li>Detect and prevent fraud, abuse, and security issues</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                Loopbrain and AI Processing
              </h2>
              <p>
                Loopbrain uses artificial intelligence to provide organizational intelligence features. When you interact with Loopbrain:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-2 mt-3">
                <li>Your workspace data (projects, tasks, org structure) is used to provide contextual responses</li>
                <li>Conversations with Loopbrain may be processed by third-party AI providers (currently OpenAI)</li>
                <li>We do not use your data to train AI models</li>
                <li>AI-generated outputs are based on your workspace context and are not shared with other users or workspaces</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                How We Share Your Information
              </h2>
              <p>We do not sell your personal information. We may share your information with:</p>

              <h3 className="text-lg font-medium text-landing-text mt-6 mb-3">
                Service providers
              </h3>
              <p>Third parties that help us operate the Service:</p>
              <ul className="list-disc list-outside ml-5 space-y-2 mt-3">
                <li><strong className="text-landing-text">OpenAI:</strong> AI processing for Loopbrain features</li>
                <li><strong className="text-landing-text">Supabase:</strong> Database hosting and authentication</li>
                <li><strong className="text-landing-text">Resend:</strong> Email delivery</li>
                <li><strong className="text-landing-text">Vercel:</strong> Application hosting</li>
              </ul>
              <p className="mt-3">
                These providers are contractually bound to protect your data and only use it to provide services to us.
              </p>

              <h3 className="text-lg font-medium text-landing-text mt-6 mb-3">
                Legal requirements
              </h3>
              <p>
                We may disclose your information if required by law, court order, or government request, or to protect the rights, property, or safety of Loopwell, our users, or others.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                Data Retention
              </h2>
              <p>
                We retain your information for as long as your account is active or as needed to provide the Service. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or legitimate business purposes.
              </p>
              <p>
                Workspace data (projects, documents, etc.) is retained according to your workspace settings and can be exported or deleted upon request.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                Data Security
              </h2>
              <p>
                We implement appropriate technical and organizational measures to protect your information, including:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-2 mt-3">
                <li>Encryption of data in transit (TLS) and at rest</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security assessments</li>
                <li>Workspace-level data isolation</li>
              </ul>
              <p className="mt-3">
                However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                Your Rights
              </h2>
              <p>
                Under GDPR and applicable data protection laws, you have the right to:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-2 mt-3">
                <li><strong className="text-landing-text">Access:</strong> Request a copy of your personal data</li>
                <li><strong className="text-landing-text">Rectification:</strong> Correct inaccurate or incomplete data</li>
                <li><strong className="text-landing-text">Erasure:</strong> Request deletion of your personal data</li>
                <li><strong className="text-landing-text">Portability:</strong> Receive your data in a structured, machine-readable format</li>
                <li><strong className="text-landing-text">Restriction:</strong> Request limitation of processing</li>
                <li><strong className="text-landing-text">Objection:</strong> Object to processing based on legitimate interests</li>
                <li><strong className="text-landing-text">Withdraw consent:</strong> Where processing is based on consent</li>
              </ul>
              <p className="mt-3">
                To exercise these rights, contact us at{" "}
                <a href="mailto:privacy@loopwell.io" className="text-landing-accent hover:underline">
                  privacy@loopwell.io
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">Cookies</h2>
              <p>
                We use essential cookies to operate the Service (authentication, preferences). We may use analytics cookies to understand how the Service is used. You can control cookies through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                International Data Transfers
              </h2>
              <p>
                Your information may be transferred to and processed in countries outside the European Economic Area (EEA), including the United States (for AI processing). We ensure appropriate safeguards are in place, such as Standard Contractual Clauses, to protect your data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                Children&apos;s Privacy
              </h2>
              <p>
                The Service is not intended for users under 16 years of age. We do not knowingly collect personal information from children under 16.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page and updating the &ldquo;Last updated&rdquo; date. Your continued use of the Service after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or our data practices, contact us at:
              </p>
              <div className="mt-4 p-4 bg-landing-surface rounded-lg border border-landing-border">
                <p className="text-landing-text font-medium">Loopwell Intelligence OÜ</p>
                <p>Tallinn, Estonia</p>
                <p>
                  Email:{" "}
                  <a href="mailto:privacy@loopwell.io" className="text-landing-accent hover:underline">
                    privacy@loopwell.io
                  </a>
                </p>
              </div>
            </section>

          </div>
        </article>
      </main>

      <LandingFooter />
    </div>
  )
}
