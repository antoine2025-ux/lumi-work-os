"use client"

import { HeroDashboardMockup } from "@/components/landing/HeroDashboardMockup";
import { SpacesMockup } from "@/components/landing/SpacesMockup";
import { OrgMockup } from "@/components/landing/OrgMockup";
import { LoopbrainMockup } from "@/components/landing/LoopbrainMockup";
import { ArchitectureMockup } from "@/components/landing/ArchitectureMockup";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { ArrowRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { ThemeProvider } from "next-themes";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const slideFromLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const slideFromRight = {
  hidden: { opacity: 0, x: 60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
};

// ─── Typewriter ───────────────────────────────────────────────────────────────

interface TypewriterTextProps {
  text: string;
  startDelay?: number;
  typingSpeed?: number;
  className?: string;
}

function TypewriterText({
  text,
  startDelay = 0,
  typingSpeed = 50,
  className,
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const hasStarted = useRef(false);

  useEffect(() => {
    // useRef guard prevents re-triggering on parent re-renders
    if (hasStarted.current) return;
    const t = setTimeout(() => {
      hasStarted.current = true;
      setIsTyping(true);
    }, startDelay * 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isTyping) return;
    let i = 0;
    const interval = setInterval(() => {
      if (i <= text.length) {
        setDisplayedText(text.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, typingSpeed);
    return () => clearInterval(interval);
  }, [isTyping, text, typingSpeed]);

  return (
    <span className={className}>
      {displayedText}
      {isTyping && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-[3px] h-[0.8em] bg-landing-text ml-1 align-middle"
        />
      )}
    </span>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection() {
  const [typingComplete, setTypingComplete] = useState(false);
  const [showSubheadline, setShowSubheadline] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(true); // default true to avoid overflow on first paint

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsMobile(!mq.matches);
    const h = (e: MediaQueryListEvent) => setIsMobile(!e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  // All timings pre-calculated — no state changes occur during the typing phase
  const line1Start = 0.3;
  const line1Duration = "One workspace.".length * 0.05; // 0.7s
  const line2Start = line1Start + line1Duration + 0.15; // 1.15s
  const line2Duration = "One brain.".length * 0.05; // 0.5s
  const line3Start = line2Start + line2Duration + 0.15; // 1.8s
  const line3Duration = "Full stop.".length * 0.05; // 0.5s
  const allTypingDone = line3Start + line3Duration + 0.3; // 2.6s
  const slideDuration = 0.7;
  const slideCompleteTime = allTypingDone + slideDuration; // 3.3s
  const subheadlineStart = slideCompleteTime + 0.2; // 3.5s
  const ctaStart = subheadlineStart + 0.6; // 4.1s

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReducedMotion(true);
      setTypingComplete(true);
      setShowSubheadline(true);
      setShowCTA(true);
      return;
    }
    const t1 = setTimeout(() => setTypingComplete(true), allTypingDone * 1000);
    const t2 = setTimeout(() => setShowSubheadline(true), subheadlineStart * 1000);
    const t3 = setTimeout(() => setShowCTA(true), ctaStart * 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ctaButtons = (
    <>
      <a
        href="/login"
        className="inline-flex items-center justify-center px-6 py-3 bg-landing-accent text-white font-medium rounded-lg hover:bg-landing-accent-hover transition-colors"
      >
        Get Started
        <ArrowRight className="ml-2 w-4 h-4" />
      </a>
      <a
        href="#dashboard-section"
        className="inline-flex items-center justify-center px-6 py-3 bg-landing-surface text-landing-text font-medium rounded-lg border border-landing-border hover:bg-landing-surface-elevated transition-colors"
      >
        See how it works
      </a>
    </>
  );

  if (reducedMotion) {
    return (
      <section className="min-h-screen flex items-center bg-landing-bg-hero relative">
        <div className="max-w-6xl mx-auto px-4 md:px-6 w-full">
          <h1 className="text-3xl md:text-5xl lg:text-7xl font-semibold text-landing-text leading-tight tracking-tight">
            <span className="block">One workspace.</span>
            <span className="block">One brain.</span>
            <span className="block">Full stop.</span>
          </h1>
          <p className="mt-8 text-lg md:text-xl text-landing-text-secondary max-w-2xl leading-relaxed">
            Coordination kills momentum. Meetings about meetings. Updates about
            updates. Loopwell runs your operations. Your team does actual work.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            {ctaButtons}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen flex items-center bg-landing-bg-hero relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 md:px-6 w-full">
        {/* Fixed-height spans prevent layout shift; lines 2+3 slide from indented to left */}
        <h1 className="text-3xl md:text-5xl lg:text-7xl font-semibold text-landing-text leading-tight tracking-tight">
          <motion.span className="block h-[1.2em]" initial={{ x: 0 }} animate={{ x: 0 }}>
            <TypewriterText text="One workspace." startDelay={line1Start} />
          </motion.span>
          <motion.span
            className="block h-[1.2em]"
            initial={{ x: isMobile ? 0 : "20vw" }}
            animate={{ x: typingComplete ? 0 : isMobile ? 0 : "20vw" }}
            transition={{ duration: slideDuration, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <TypewriterText text="One brain." startDelay={line2Start} />
          </motion.span>
          <motion.span
            className="block h-[1.2em]"
            initial={{ x: isMobile ? 0 : "40vw" }}
            animate={{ x: typingComplete ? 0 : isMobile ? 0 : "40vw" }}
            transition={{ duration: slideDuration, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <TypewriterText text="Full stop." startDelay={line3Start} />
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={showSubheadline ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-8 text-lg md:text-xl text-landing-text-secondary max-w-2xl leading-relaxed"
        >
          Coordination kills momentum. Meetings about meetings. Updates about
          updates. Loopwell runs your operations. Your team does actual work.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={showCTA ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-10 flex flex-col sm:flex-row gap-4"
        >
          {ctaButtons}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={showCTA ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-6 h-10 border-2 border-landing-text-muted rounded-full flex justify-center pt-2"
        >
          <div className="w-1.5 h-1.5 bg-landing-text-muted rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={true}
      storageKey="landing-theme"
      disableTransitionOnChange={false}
    >
    <div className="min-h-screen bg-landing-bg transition-colors duration-300 overflow-x-hidden">
      <LandingNav />

      {/* Hero */}
      <HeroSection />

      {/* Numbered Feature Sections */}
      <section id="features" className="border-t border-landing-border">

        {/* 1.0 Dashboard */}
        <div id="dashboard-section" className="pt-12 pb-16 md:pb-24 lg:pb-32 px-4 sm:px-6 lg:px-8 bg-landing-bg-hero">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="max-w-6xl mx-auto"
          >
            <div className="max-w-2xl mb-12">
              <p className="text-sm text-landing-text-muted font-mono tracking-widest mb-4">1.0</p>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-landing-text leading-tight mb-4">
                From overview to action in seconds
              </h2>
              <p className="text-lg text-landing-text-secondary leading-relaxed">
                See what is on your plate. Ask Loopbrain to handle it. Your dashboard becomes your operator, scheduling, assigning, and organizing while you focus on real work.
              </p>
            </div>
            <HeroDashboardMockup />
          </motion.div>
        </div>

        {/* 2.0 Spaces */}
        <div id="spaces-section" className="py-16 md:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-landing-bg-main">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={slideFromLeft}
            className="max-w-6xl mx-auto"
          >
            <div className="max-w-2xl mb-12">
              <p className="text-sm text-landing-text-muted font-mono tracking-widest mb-4">2.0</p>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-landing-text leading-tight mb-4">
                Work with context, not assumptions
              </h2>
              <p className="text-lg text-landing-text-secondary leading-relaxed">
                Projects and their documentation live together. When you open a project, everything related is already there: specs, notes, decisions, history.
              </p>
            </div>
            <SpacesMockup />
          </motion.div>
        </div>

        {/* 3.0 Org */}
        <div id="org-section" className="py-16 md:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-landing-bg-main">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={slideFromRight}
            className="max-w-6xl mx-auto"
          >
            <div className="max-w-2xl mb-12">
              <p className="text-sm text-landing-text-muted font-mono tracking-widest mb-4">3.0</p>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-landing-text leading-tight mb-4">
                Org management without the spreadsheets
              </h2>
              <p className="text-lg text-landing-text-secondary leading-relaxed">
                Headcount planning, capacity tracking, team structure: live data, not a quarterly export. Stop asking around. Loopbrain knows who owns what, who decides what, and who is available. One question, one answer.
              </p>
            </div>
            <OrgMockup />
          </motion.div>
        </div>

        {/* 4.0 Loopbrain */}
        <div id="loopbrain-section" className="py-16 md:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-landing-bg-main">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={slideFromLeft}
            className="max-w-6xl mx-auto"
          >
            <div className="max-w-2xl mb-12">
              <p className="text-sm text-landing-text-muted font-mono tracking-widest mb-4">4.0</p>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-landing-text leading-tight mb-4">
                A proactive agent, not a chatbot
              </h2>
              <p className="text-lg text-landing-text-secondary leading-relaxed">
                You take the meetings. Loopbrain plans the next steps, assigns work, and follows up. It monitors capacity, detects blockers, and takes action.
              </p>
            </div>
            <LoopbrainMockup />
          </motion.div>
        </div>

        {/* 5.0 Architecture */}
        <div id="architecture-section" className="py-16 md:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-landing-bg-main">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="max-w-6xl mx-auto"
          >
            <div className="max-w-2xl mb-12">
              <p className="text-sm text-landing-text-muted font-mono tracking-widest mb-4">5.0</p>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-landing-text leading-tight mb-4">
                Intelligence built in, not bolted on
              </h2>
              <p className="text-lg text-landing-text-secondary leading-relaxed">
                Projects, people, docs, goals: all connected. Loopbrain understands the relationships, takes action, and keeps your organization in sync.
              </p>
            </div>
            <ArchitectureMockup />
          </motion.div>
        </div>

      </section>

      {/* How It Works */}
      <section id="how-it-works-section" className="py-16 md:py-24 lg:py-32 border-t border-landing-border bg-landing-bg-footer">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
          >
            <p className="text-sm text-landing-text-muted font-mono tracking-widest mb-3">6.0</p>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-landing-text mb-12">
              How it works
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8 md:gap-12"
          >
            <motion.div variants={staggerItem} className="space-y-4">
              <div className="w-10 h-10 rounded-full bg-landing-accent/10 flex items-center justify-center">
                <span className="text-landing-accent font-semibold">1</span>
              </div>
              <h3 className="text-xl font-semibold text-landing-text">
                Set up your workspace
              </h3>
              <p className="text-landing-text-secondary">
                Create your org structure: teams, roles, capacity.
              </p>
            </motion.div>

            <motion.div variants={staggerItem} className="space-y-4">
              <div className="w-10 h-10 rounded-full bg-landing-accent/10 flex items-center justify-center">
                <span className="text-landing-accent font-semibold">2</span>
              </div>
              <h3 className="text-xl font-semibold text-landing-text">
                Connect your tools
              </h3>
              <p className="text-landing-text-secondary">
                Import from Notion, Clickup, Google and more. Migrate existing data or start from scratch.
              </p>
            </motion.div>

            <motion.div variants={staggerItem} className="space-y-4">
              <div className="w-10 h-10 rounded-full bg-landing-accent/10 flex items-center justify-center">
                <span className="text-landing-accent font-semibold">3</span>
              </div>
              <h3 className="text-xl font-semibold text-landing-text">
                Loopbrain learns and acts
              </h3>
              <p className="text-landing-text-secondary">
                It monitors your org, detects problems, and takes action. You stay in control.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Credibility */}
      <section className="py-16 md:py-24 lg:py-32 border-t border-landing-border bg-landing-bg-footer">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="max-w-4xl mx-auto px-4 sm:px-6 text-center"
        >
          <p className="text-xl md:text-2xl text-landing-text-secondary mb-6">
            We&apos;re building the tool we wished we had &rarr; and we&apos;re doing it with the speed of startups and the rigor of institutional banking.
          </p>
          <p className="text-lg text-landing-text-muted">
            Loopwell is built by ex-Wise and Nordea employees.
          </p>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 lg:py-32 border-t border-landing-border bg-landing-bg-footer">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-semibold text-landing-text mb-8">
            Put operations on autopilot.
          </h2>
          <a
            href="/signup"
            className="inline-flex items-center justify-center px-6 py-3 bg-landing-accent text-white font-medium rounded-lg hover:bg-landing-accent-hover transition-colors"
          >
            Get Early Access
            <ArrowRight className="ml-2 w-4 h-4" />
          </a>
        </div>
      </section>

      <LandingFooter />
    </div>
    </ThemeProvider>
  );
}
