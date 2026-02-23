import { LandingNav } from "@/components/landing/LandingNav"
import { LandingFooter } from "@/components/landing/LandingFooter"

export const metadata = {
  title: "Our Story | Loopwell",
  description:
    "The real bottleneck at work isn't intelligence. It's context. Learn why we built Loopwell.",
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-landing-bg transition-colors duration-300">
      <LandingNav />

      <main>
        <article className="max-w-3xl mx-auto px-6 py-24 md:py-32">
          {/* Header */}
          <header className="mb-16">
            <h1 className="text-4xl md:text-5xl font-semibold text-landing-text mb-4">
              Our Story
            </h1>
            <p className="text-landing-text-muted">Antoine Morlet, Founder &amp; CEO</p>
          </header>

          {/* Story Content */}
          <div className="prose-landing space-y-6">
            <p>
              For the past ten years, I&apos;ve been the guy in the middle. The one connecting
              dots. The one who knows who to call, how to explain something to engineering without
              annoying them, how to speak to leadership without overcomplicating things.
            </p>

            <p>
              I never saw myself as &ldquo;a project manager.&rdquo; It&apos;s more like&hellip;
              I&apos;ve spent a decade walking into messy situations and figuring them out.
              Understanding who owns what. Understanding where things get stuck. And then aligning
              people.
            </p>

            <p>
              When AI became usable, it felt like superpowers. I could think faster. Structure
              faster. Break down complexity in seconds.
            </p>

            <p>But every time I closed the tab, the same frustration hit me.</p>

            <p>
              It didn&apos;t know our org structure. It didn&apos;t know who actually makes
              decisions. It didn&apos;t know which project was quietly dying. It didn&apos;t know
              that Task 14 is blocked because compliance hasn&apos;t reviewed something.
            </p>

            <p>It only knew whatever I managed to cram into a prompt.</p>

            <p>
              And that&apos;s when it clicked.{" "}
              <strong className="text-landing-text font-semibold">
                The real bottleneck at work isn&apos;t intelligence. It&apos;s context.
              </strong>
            </p>

            <p>
              We&apos;re surrounded by tools. Docs in one place. Tasks somewhere else. Org charts
              outdated. Decisions buried in Slack threads. We spend an absurd amount of time
              reconstructing reality.
            </p>

            <p className="text-landing-text">
              Who owns this? What was decided? Where are we actually at?
            </p>

            <p>
              So I stopped thinking about AI as a chatbot. I started thinking about it as something
              that should sit inside the organization itself. A system that understands:
            </p>

            <ul className="space-y-2 my-6 not-prose">
              {[
                "The people",
                "The roles",
                "The projects",
                "The tasks",
                "The decisions",
                "The relationships between all of them",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-landing-accent flex-shrink-0" />
                  <span className="text-landing-text-secondary">{item}</span>
                </li>
              ))}
            </ul>

            <p>
              Something that doesn&apos;t just answer questions, but actually sees how the company
              works.
            </p>

            <p className="text-landing-text font-medium">That&apos;s Loopwell.</p>

            {/* Aleksei section */}
            <div className="border-t border-landing-border pt-8 mt-12">
              <p>I didn&apos;t want to build this alone.</p>

              <p>
                I met Aleksei at Wise five years ago. We&apos;d worked together before, but never
                anything this ambitious. When I walked him through the concept, he didn&apos;t need
                convincing. He&apos;d felt the same pain.
              </p>

              <p>
                Aleksei built the entire Org module from scratch: people, teams, capacity,
                roles&mdash;the layer that makes Loopbrain actually understand how a company works.
                While I was obsessing over the vision, he was making it real.
              </p>

              <p>
                We both came from Wise. We&apos;ve seen what good operations look like at scale.
                Now we&apos;re building the tool we wished we had.
              </p>

              <p className="text-landing-text font-medium">That&apos;s Loopwell.</p>
            </div>
          </div>

          {/* Team section */}
          <div className="mt-16 pt-12 border-t border-landing-border">
            <h2 className="text-sm uppercase tracking-wider text-landing-text-muted mb-8">
              The Team
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-landing-accent/20 flex items-center justify-center text-landing-accent font-semibold text-lg flex-shrink-0">
                  AM
                </div>
                <div>
                  <p className="font-medium text-landing-text">Antoine Morlet</p>
                  <p className="text-sm text-landing-text-secondary">Founder &amp; CEO</p>
                  <p className="text-sm text-landing-text-muted mt-1">Ex-Wise, Ex-Nordea</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-landing-accent/20 flex items-center justify-center text-landing-accent font-semibold text-lg flex-shrink-0">
                  AS
                </div>
                <div>
                  <p className="font-medium text-landing-text">Aleksei Skvortsov</p>
                  <p className="text-sm text-landing-text-secondary">Co-founder</p>
                  <p className="text-sm text-landing-text-muted mt-1">Ex-Wise</p>
                </div>
              </div>
            </div>
          </div>
        </article>
      </main>

      <LandingFooter />
    </div>
  )
}
