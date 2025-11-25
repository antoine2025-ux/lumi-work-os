import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: 'swap', // Add font-display: swap for better LCP
  preload: true,   // Preload critical font
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://loopwell.io'),
  title: {
    default: "Loopwell - The End of Disconnected Work",
    template: "%s | Loopwell",
  },
  description: "Loopwell gives startups the structural intelligence of world-class organizations, without the bureaucracy. It connects projects, knowledge, and people into one system that builds alignment, discipline, and momentum from day one.",
  keywords: ["workplace productivity", "project management", "knowledge management", "team collaboration", "AI workspace", "startup tools", "organizational intelligence"],
  authors: [{ name: "Loopwell Team" }],
  creator: "Loopwell",
  publisher: "Loopwell",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://loopwell.io",
    siteName: "Loopwell",
    title: "Loopwell - The End of Disconnected Work",
    description: "Loopwell gives startups the structural intelligence of world-class organizations, without the bureaucracy.",
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
    creator: "@loopwell",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL || "https://loopwell.io",
  },
  verification: {
    // Add your verification codes here when you set up Google Search Console, etc.
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} font-sans antialiased bg-slate-950`}>
        <Providers>
          {children}
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
