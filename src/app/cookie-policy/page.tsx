import { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Cookie } from "lucide-react"

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Learn about how Loopwell uses cookies to provide and improve our services. Understand our cookie practices and how to manage your preferences.",
}

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Cookie className="w-8 h-8 text-primary" />
              <CardTitle className="text-3xl font-bold">Cookie Policy</CardTitle>
            </div>
            <CardDescription className="text-base">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="prose prose-slate max-w-none">
            <div className="space-y-6 text-slate-700">
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. Introduction</h2>
                <p>
                  This Cookie Policy explains how Loopwell Work OS ("we", "us", or "our") uses cookies and similar 
                  tracking technologies when you visit our website and use our services. This policy should be read 
                  alongside our Privacy Policy and Terms of Service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. What Are Cookies?</h2>
                <p>
                  Cookies are small text files that are placed on your device (computer, tablet, or mobile) when you 
                  visit a website. They are widely used to make websites work more efficiently and provide information 
                  to the website owners. Cookies allow a website to recognize your device and store some information 
                  about your preferences or past actions.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. How We Use Cookies</h2>
                <p>
                  We use cookies for the following purposes:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>
                    <strong>Authentication:</strong> To keep you logged in and maintain your session across different 
                    pages of our application.
                  </li>
                  <li>
                    <strong>Security:</strong> To protect against unauthorized access and ensure the security of your 
                    account.
                  </li>
                  <li>
                    <strong>Preferences:</strong> To remember your preferences and settings to provide a personalized 
                    experience.
                  </li>
                  <li>
                    <strong>Functionality:</strong> To enable core features of our application, such as workspace 
                    selection and user interface preferences.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Types of Cookies We Use</h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">4.1 Essential Cookies</h3>
                    <p>
                      These cookies are necessary for the website to function properly. They enable core functionality 
                      such as security, network management, and accessibility. You cannot opt-out of these cookies 
                      as they are essential for the service to work.
                    </p>
                    <div className="mt-3 p-4 bg-slate-50 rounded-lg">
                      <p className="font-semibold mb-2">Examples of essential cookies we use:</p>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>
                          <strong>next-auth.session-token:</strong> Stores your authentication session to keep you 
                          logged in. This cookie is HttpOnly and Secure for enhanced security.
                        </li>
                        <li>
                          <strong>next-auth.csrf-token:</strong> Protects against Cross-Site Request Forgery (CSRF) 
                          attacks. This cookie is HttpOnly and Secure.
                        </li>
                        <li>
                          <strong>next-auth.callback-url:</strong> Stores the URL to redirect to after authentication. 
                          This cookie is HttpOnly and Secure.
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">4.2 Third-Party Cookies</h3>
                    <p>
                      We use Google OAuth for authentication, which may set cookies on your device. These cookies are 
                      managed by Google and are subject to Google's Privacy Policy.
                    </p>
                    <div className="mt-3 p-4 bg-slate-50 rounded-lg">
                      <p className="font-semibold mb-2">Google OAuth cookies:</p>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>
                          Google may set cookies related to authentication and account selection when you sign in with 
                          Google. These cookies help Google remember your account preferences and streamline the 
                          authentication process.
                        </li>
                        <li>
                          For more information about Google's use of cookies, please visit{" "}
                          <a 
                            href="https://policies.google.com/privacy" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Google's Privacy Policy
                          </a>.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Cookie Duration</h2>
                <p>
                  Cookies we use have different lifespans:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>
                    <strong>Session Cookies:</strong> These are temporary cookies that are deleted when you close 
                    your browser. They are used to maintain your session while you navigate our application.
                  </li>
                  <li>
                    <strong>Persistent Cookies:</strong> These remain on your device for a set period or until you 
                    delete them. Our authentication cookies typically persist until you log out or they expire 
                    (usually after a period of inactivity or a maximum duration set by our security policies).
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. Managing Cookies</h2>
                <p>
                  You have control over cookies. Most web browsers allow you to control cookies through their settings. 
                  However, please note that disabling certain cookies may impact the functionality of our services.
                </p>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-semibold mb-2">How to manage cookies:</p>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li>
                      <strong>Browser Settings:</strong> You can control cookies through your browser settings. 
                      Most browsers allow you to see what cookies you have and delete them individually or in bulk.
                    </li>
                    <li>
                      <strong>Opt-Out:</strong> You can opt-out of non-essential cookies, but please note that 
                      essential cookies are required for the service to function.
                    </li>
                    <li>
                      <strong>Logout:</strong> When you log out of our service, we clear your session cookies. 
                      However, some cookies may persist until you clear them manually through your browser settings.
                    </li>
                  </ul>
                </div>
                <p className="mt-4">
                  For instructions on how to manage cookies in your specific browser, please refer to your browser's 
                  help documentation:
                </p>
                <ul className="list-disc pl-6 space-y-1 mt-2 text-sm">
                  <li>
                    <a 
                      href="https://support.google.com/chrome/answer/95647" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Google Chrome
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Mozilla Firefox
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Safari
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Microsoft Edge
                    </a>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">7. Third-Party Services</h2>
                <p>
                  Our service uses Google OAuth for authentication. When you sign in with Google, Google may set 
                  cookies on your device. These cookies are governed by Google's Privacy Policy and Cookie Policy. 
                  We do not have control over these third-party cookies.
                </p>
                <p className="mt-4">
                  We recommend reviewing the privacy policies of third-party services we integrate with:
                </p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>
                    <a 
                      href="https://policies.google.com/privacy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Google Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://policies.google.com/technologies/cookies" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Google Cookie Policy
                    </a>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">8. Updates to This Policy</h2>
                <p>
                  We may update this Cookie Policy from time to time to reflect changes in our practices or for other 
                  operational, legal, or regulatory reasons. We will notify you of any material changes by posting the 
                  new Cookie Policy on this page and updating the "Last updated" date.
                </p>
                <p className="mt-4">
                  We encourage you to review this Cookie Policy periodically to stay informed about how we use cookies.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">9. Contact Us</h2>
                <p>
                  If you have any questions about this Cookie Policy or our use of cookies, please contact us:
                </p>
                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                  <p className="font-semibold">Loopwell Work OS</p>
                  <p className="text-sm mt-2">
                    For questions about cookies or privacy, please contact your administrator or reach out through 
                    our support channels.
                  </p>
                </div>
              </section>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}


