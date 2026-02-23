import { LandingNav } from "@/components/landing/LandingNav"
import { LandingFooter } from "@/components/landing/LandingFooter"

export const metadata = {
  title: "Terms of Service | Loopwell",
  description: "Terms and conditions for using Loopwell.",
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-landing-bg transition-colors duration-300">
      <LandingNav />

      <main>
        <article className="max-w-3xl mx-auto px-6 py-24 md:py-32">
          <header className="mb-12">
            <h1 className="text-4xl md:text-5xl font-semibold text-landing-text mb-4">
              Terms of Service
            </h1>
            <p className="text-landing-text-muted">Last updated: February 2026</p>
          </header>

          <div className="prose-landing space-y-8 text-landing-text-secondary leading-relaxed">

            <section>
              <p>
                These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the Loopwell platform and services (the &ldquo;Service&rdquo;) provided by Loopwell Intelligence OÜ (&ldquo;Loopwell,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
              </p>
              <p>
                By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                1. Account Registration
              </h2>
              <p>To use the Service, you must create an account. You agree to:</p>
              <ul className="list-disc list-outside ml-5 space-y-2 mt-3">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Be responsible for all activities under your account</li>
              </ul>
              <p className="mt-3">
                You must be at least 16 years old to use the Service. If you are using the Service on behalf of an organization, you represent that you have authority to bind that organization to these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                2. Workspaces and Data
              </h2>
              <p>
                When you create a workspace, you are the owner of that workspace. Workspace owners can invite members, configure settings, and control access to workspace data.
              </p>
              <p>
                <strong className="text-landing-text">Your Data:</strong> You retain ownership of all content you upload, create, or store in the Service (&ldquo;Your Data&rdquo;). You grant us a limited license to host, store, and process Your Data solely to provide the Service to you.
              </p>
              <p>
                <strong className="text-landing-text">Data Isolation:</strong> Your workspace data is isolated from other workspaces. We do not access Your Data except as necessary to provide the Service, respond to support requests, or comply with legal obligations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                3. Acceptable Use
              </h2>
              <p>You agree not to use the Service to:</p>
              <ul className="list-disc list-outside ml-5 space-y-2 mt-3">
                <li>Violate any applicable law or regulation</li>
                <li>Infringe on the intellectual property or privacy rights of others</li>
                <li>Upload malicious code, viruses, or harmful content</li>
                <li>Attempt to gain unauthorized access to the Service or other users&apos; data</li>
                <li>Interfere with or disrupt the Service&apos;s infrastructure</li>
                <li>Use the Service for any illegal, harmful, or fraudulent purpose</li>
                <li>Resell, sublicense, or redistribute the Service without our permission</li>
                <li>Use automated means to access the Service (except approved integrations)</li>
              </ul>
              <p className="mt-3">
                We reserve the right to suspend or terminate accounts that violate these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                4. Loopbrain AI Features
              </h2>
              <p>
                Loopbrain provides AI-powered features including organizational intelligence, task automation, and contextual assistance. You acknowledge that:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-2 mt-3">
                <li>AI outputs are generated based on your workspace data and may not always be accurate</li>
                <li>You are responsible for reviewing and verifying AI-generated content before acting on it</li>
                <li>AI features may use third-party providers (such as OpenAI) to process requests</li>
                <li>We do not guarantee specific outcomes from AI features</li>
              </ul>
              <p className="mt-3">
                Do not input sensitive personal information (such as social security numbers, medical records, or financial account details) into Loopbrain conversations unless necessary for your legitimate business purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                5. Service Availability
              </h2>
              <p>
                We strive to maintain high availability but do not guarantee uninterrupted access to the Service. The Service may be temporarily unavailable due to:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-2 mt-3">
                <li>Scheduled maintenance (we will provide advance notice when possible)</li>
                <li>Unplanned outages or technical issues</li>
                <li>Factors outside our control (internet connectivity, third-party services)</li>
              </ul>
              <p className="mt-3">We are not liable for any loss or damage resulting from service interruptions.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                6. Payment Terms
              </h2>
              <p>
                Certain features of the Service may require a paid subscription. If you subscribe to a paid plan:
              </p>
              <ul className="list-disc list-outside ml-5 space-y-2 mt-3">
                <li>You agree to pay all applicable fees as described at the time of purchase</li>
                <li>Subscriptions automatically renew unless cancelled before the renewal date</li>
                <li>Fees are non-refundable except as required by law or stated in our refund policy</li>
                <li>We may change pricing with 30 days&apos; notice before your next billing cycle</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                7. Intellectual Property
              </h2>
              <p>
                <strong className="text-landing-text">Our Property:</strong> The Service, including its design, features, code, documentation, and branding, is owned by Loopwell and protected by intellectual property laws. You may not copy, modify, distribute, or reverse engineer any part of the Service.
              </p>
              <p>
                <strong className="text-landing-text">Your Property:</strong> You retain all rights to Your Data. We do not claim ownership of content you create or upload to the Service.
              </p>
              <p>
                <strong className="text-landing-text">Feedback:</strong> If you provide feedback, suggestions, or ideas about the Service, you grant us a royalty-free, perpetual license to use that feedback to improve the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                8. Confidentiality
              </h2>
              <p>
                We treat Your Data as confidential and will not disclose it to third parties except as described in our Privacy Policy or with your consent. You agree to keep confidential any non-public information about the Service, including pricing, features in development, and security measures.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">9. Termination</h2>
              <p>
                <strong className="text-landing-text">By You:</strong> You may close your account at any time through your account settings or by contacting us. Upon termination, your access to the Service will end, and Your Data will be deleted within 30 days (unless you request an export).
              </p>
              <p>
                <strong className="text-landing-text">By Us:</strong> We may suspend or terminate your account if you violate these Terms, fail to pay fees, or engage in activity that harms the Service or other users. We will provide notice when possible, except in cases of severe violations.
              </p>
              <p>
                Upon termination, sections that by their nature should survive (such as intellectual property, limitation of liability, and dispute resolution) will remain in effect.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                10. Disclaimer of Warranties
              </h2>
              <p>
                THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
              <p>
                We do not warrant that the Service will be error-free, secure, or uninterrupted, or that it will meet your specific requirements.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                11. Limitation of Liability
              </h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, LOOPWELL SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.
              </p>
              <p>
                OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM, OR €100, WHICHEVER IS GREATER.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                12. Indemnification
              </h2>
              <p>
                You agree to indemnify and hold harmless Loopwell, its officers, employees, and agents from any claims, damages, losses, or expenses (including legal fees) arising from your use of the Service, your violation of these Terms, or your violation of any rights of a third party.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                13. Governing Law and Disputes
              </h2>
              <p>
                These Terms are governed by the laws of the Republic of Estonia, without regard to conflict of law principles.
              </p>
              <p>
                Any disputes arising from these Terms or the Service shall be resolved through good-faith negotiation. If negotiation fails, disputes shall be submitted to the courts of Tallinn, Estonia, which shall have exclusive jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                14. Changes to These Terms
              </h2>
              <p>
                We may update these Terms from time to time. We will notify you of material changes by posting the updated Terms and updating the &ldquo;Last updated&rdquo; date. For significant changes, we may also notify you by email.
              </p>
              <p>
                Your continued use of the Service after changes take effect constitutes acceptance of the updated Terms. If you do not agree to the changes, you should stop using the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">
                15. General Provisions
              </h2>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li><strong className="text-landing-text">Entire Agreement:</strong> These Terms, together with the Privacy Policy, constitute the entire agreement between you and Loopwell regarding the Service.</li>
                <li><strong className="text-landing-text">Severability:</strong> If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in effect.</li>
                <li><strong className="text-landing-text">Waiver:</strong> Our failure to enforce any right or provision of these Terms does not constitute a waiver of that right or provision.</li>
                <li><strong className="text-landing-text">Assignment:</strong> You may not assign your rights under these Terms without our consent. We may assign our rights to a successor in the event of a merger, acquisition, or sale of assets.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-landing-text mb-4">Contact Us</h2>
              <p>If you have questions about these Terms, contact us at:</p>
              <div className="mt-4 p-4 bg-landing-surface rounded-lg border border-landing-border">
                <p className="text-landing-text font-medium">Loopwell Intelligence OÜ</p>
                <p>Tallinn, Estonia</p>
                <p>
                  Email:{" "}
                  <a href="mailto:legal@loopwell.io" className="text-landing-accent hover:underline">
                    legal@loopwell.io
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
