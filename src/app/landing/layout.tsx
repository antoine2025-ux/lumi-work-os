import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Loopwell – Organizational Intelligence for Growing Teams",
  description: "Loopwell connects projects, documentation, org structure, and contextual AI into one system that behaves like a proactive team member. Join the waitlist for early access.",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

