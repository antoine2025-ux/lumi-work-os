import type { Metadata } from "next";

export const landingMetadata: Metadata = {
  title: "Loopwell - The End of Disconnected Work",
  description: "Loopwell gives startups the structural intelligence of world-class organizations, without the bureaucracy. It connects projects, knowledge, and people into one system that builds alignment, discipline, and momentum from day one.",
  openGraph: {
    title: "Loopwell - The End of Disconnected Work",
    description: "Loopwell gives startups the structural intelligence of world-class organizations, without the bureaucracy. Join the waitlist for early access.",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Loopwell - Intelligent Workplace Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Loopwell - The End of Disconnected Work",
    description: "Loopwell gives startups the structural intelligence of world-class organizations, without the bureaucracy.",
    images: ["/og-image.png"],
  },
};



