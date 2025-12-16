import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description: "Read the latest news, product updates, and insights about Loopwell - organizational intelligence for growing teams.",
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

