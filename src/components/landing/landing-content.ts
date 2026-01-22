/**
 * Shared landing page content data
 * Used by landing lab variants to avoid copy duplication
 */

import { 
  Brain, 
  Workflow, 
  BookOpen, 
  Users, 
  Shield, 
  Zap,
  type LucideIcon
} from "lucide-react";

// Hero section content
export const heroContent = {
  headline: {
    prefix: "The ",
    highlight: "End",
    suffix: " of Disconnected Work.",
  },
  subheadline:
    "Loopwell gives startups the structural intelligence of world-class organizations, without the bureaucracy. It connects projects, knowledge, and people into one system that builds alignment, discipline, and momentum from day one.",
  ctaPrimary: "Get Started",
  ctaSecondary: "Learn More",
  trustBadges: ["AI-powered", "Secure", "Free to start"],
} as const;

// Feature card content
export interface FeatureItem {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  title: string;
  description: string;
}

export const features: FeatureItem[] = [
  {
    id: "organizational-intelligence",
    icon: Brain,
    iconColor: "text-blue-400",
    iconBgColor: "bg-blue-500/20",
    title: "Organizational Intelligence",
    description:
      "Forget \"AI assistants.\" Loopwell doesn't guess, it understands. It reads the room, connects the dots across your projects, and gives you answers that feel like they came from inside your team's collective brain.",
  },
  {
    id: "smart-project-management",
    icon: Workflow,
    iconColor: "text-green-400",
    iconBgColor: "bg-green-500/20",
    title: "Smart Project Management",
    description:
      "Less managing, more momentum. Tasks assign themselves, blockers surface before they become problems, and your team always knows what matters most, no stand-ups required.",
  },
  {
    id: "living-knowledge-base",
    icon: BookOpen,
    iconColor: "text-purple-400",
    iconBgColor: "bg-purple-500/20",
    title: "Living Knowledge Base",
    description:
      "Your company's memory, finally alive. Every idea, document, and decision stays connected to where it came from. No hunting through folders. No \"who wrote this?\" moments. Just instant context.",
  },
  {
    id: "seamless-collaboration",
    icon: Users,
    iconColor: "text-orange-400",
    iconBgColor: "bg-orange-500/20",
    title: "Seamless Collaboration",
    description:
      "Work without friction. Loopwell synchronizes updates, context, and communication automatically, so your team can focus on thinking, not typing status reports.",
  },
  {
    id: "enterprise-security",
    icon: Shield,
    iconColor: "text-red-400",
    iconBgColor: "bg-red-500/20",
    title: "Enterprise Security",
    description:
      "Freedom without compromise. Every workspace runs in a secure, isolated environment, giving startups the kind of data protection usually reserved for global enterprises.",
  },
  {
    id: "lightning-fast",
    icon: Zap,
    iconColor: "text-indigo-400",
    iconBgColor: "bg-indigo-500/20",
    title: "Lightning Fast",
    description:
      "Because context loses value in slow motion. Loopwell delivers sub-second search, instant sync, and responses that keep up with how fast your team moves.",
  },
];

// Features section header
export const featuresHeader = {
  title: "The Architecture of Organizational Intelligence",
  subtitle:
    "From contextual AI to connected documentation and project intelligence, Loopwell gives you the core systems that make collaboration self-sustaining.",
} as const;

// System layers architecture
export interface SystemLayer {
  id: string;
  number: number;
  title: string;
  description: string;
  isSpanning?: boolean; // For Layer 3 (Loopbrain) that spans others
}

export const systemLayers: SystemLayer[] = [
  {
    id: "foundation",
    number: 1,
    title: "Organizational Context",
    description: "Roles, ownership, relationships, and structure that define how work flows.",
  },
  {
    id: "execution",
    number: 2,
    title: "Spaces",
    description: "Projects, documents, tasks, and decisions live in one continuous workspace.",
  },
  {
    id: "intelligence",
    number: 3,
    title: "Loopbrain",
    description: "An always-on, contextual AI that understands work as it happens and keeps the system coherent.",
    isSpanning: true,
  },
  {
    id: "surface",
    number: 4,
    title: "Productivity Dashboard",
    description: "A live view of priorities, time, momentum, and signals — not something users maintain manually.",
  },
  {
    id: "baseline",
    number: 5,
    title: "Speed & Security",
    description: "Sub-second performance and enterprise-grade security are assumed, not marketed.",
  },
];

// Preview section content
export const previewContent = {
  title: "See Loopwell in Action",
  subtitle:
    "A first look at work that runs itself. Watch how Loopwell understands context, adapts to your team, and moves projects forward automatically.",
  sections: [
    { id: "dashboard", label: "Dashboard Overview" },
    { id: "projects", label: "Project Management" },
    { id: "wiki", label: "Spaces" },
    { id: "ai", label: "LoopBrain" },
  ],
} as const;

// Benefits/stats section
export interface StatItem {
  value: string;
  label: string;
  color: string;
}

export const stats: StatItem[] = [
  { value: "25%", label: "Productivity Increase", color: "text-blue-400" },
  { value: "10+", label: "Hours Saved Per Week", color: "text-green-400" },
  { value: "90%", label: "Reduction in Repeated Questions", color: "text-purple-400" },
  { value: "95%", label: "On-Time Project Completion", color: "text-orange-400" },
];

export const benefitsHeader = {
  title: "Why Choose Loopwell",
  subtitle: "Join us in building the future of workplace productivity.",
} as const;

export interface BenefitItem {
  title: string;
  description: string;
}

export const benefitsList: BenefitItem[] = [
  {
    title: "Calm & Minimal Design",
    description:
      "Reduce cognitive load with our thoughtfully designed interface that focuses on what matters most.",
  },
  {
    title: "AI That Actually Helps",
    description:
      "Our AI doesn't just look smart—it provides real value by understanding your context and needs.",
  },
  {
    title: "Built for Scale",
    description:
      "From startup to enterprise, Loopwell will grow with you without compromising on performance or security.",
  },
];

// Become a Tester section
export const testerContent = {
  title: "Test Loopwell Before the World Sees It",
  subtitle:
    "We're inviting a small group of early adopters to test the platform, share feedback, and shape its evolution.",
  note: "Early testers receive lifetime access perks and a permanent spot in our founding community.",
  perks: [
    {
      title: "Lifetime Benefits",
      description:
        "Early testers keep special access and perks tied to their founding membership.",
      footnote: "*Feature availability and tier structure may change after public launch.",
    },
    {
      title: "Founding Community",
      description:
        "Join an exclusive group of early adopters who helped shape Loopwell.",
    },
    {
      title: "Direct Influence",
      description:
        "Your feedback directly impacts product development and new features.",
    },
  ],
} as const;

// CTA section
export const ctaContent = {
  title: "Ready to Get Started?",
  subtitle:
    "Sign in now to access your workspace and start collaborating with your team.",
  buttonText: "Get Started",
} as const;

// Navigation links
export const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#preview", label: "Preview" },
  { href: "#benefits", label: "Benefits" },
  { href: "#become-a-tester", label: "Become a Tester" },
  { href: "/blog", label: "Blog" },
] as const;

// Footer content
export const footerContent = {
  tagline: "The intelligent workplace platform that brings teams together.",
  sections: [
    {
      title: "Product",
      links: [
        { href: "#features", label: "Features" },
        { href: "#benefits", label: "Benefits" },
        { href: "/login", label: "Sign In" },
      ],
    },
    {
      title: "Company",
      links: [
        { href: "/about", label: "About" },
        { href: "#", label: "Careers" },
        { href: "#", label: "Contact" },
      ],
    },
    {
      title: "Support",
      links: [
        { href: "#", label: "Help Center" },
        { href: "#", label: "Documentation" },
        { href: "#", label: "Community" },
        { href: "#", label: "Status" },
      ],
    },
  ],
  legal: [
    { href: "/cookie-policy", label: "Cookie Policy" },
    { href: "#", label: "Privacy Policy" },
    { href: "#", label: "Terms of Service" },
  ],
  copyright: "© 2025 Loopwell. All rights reserved.",
} as const;

