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
    default: "Loopwell – Organizational Intelligence for Growing Teams",
    template: "%s | Loopwell",
  },
  description: "Loopwell connects projects, documentation, org structure, and contextual AI into one system that behaves like a proactive team member.",
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
    title: "Loopwell – Your Company's Shared Brain",
    description: "Loopwell connects projects, documentation, org structure, and contextual AI into one system that behaves like a proactive team member.",
    images: [
      {
        url: "/og/loopwell-og.png",
        width: 1200,
        height: 630,
        alt: "Loopwell – Organizational Intelligence for Growing Teams",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Loopwell – Your Company's Shared Brain",
    description: "Loopwell connects projects, documentation, org structure, and contextual AI into one system that behaves like a proactive team member.",
    images: ["/og/loopwell-og.png"],
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
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Set dark mode immediately to prevent flash
                document.documentElement.classList.add('dark');
                const darkConfig = {
                  primary: '#60a5fa',
                  primaryForeground: '#0f172a',
                  secondary: '#1e293b',
                  secondaryForeground: '#f8fafc',
                  accent: '#1e293b',
                  accentForeground: '#f8fafc',
                  background: '#0f172a',
                  foreground: '#f8fafc',
                  muted: '#1e293b',
                  mutedForeground: '#94a3b8',
                  border: '#334155',
                  input: '#1e293b',
                  ring: '#60a5fa',
                  card: '#1e293b',
                  cardForeground: '#f8fafc',
                  popover: '#1e293b',
                  popoverForeground: '#f8fafc',
                  destructive: '#ef4444',
                  destructiveForeground: '#ffffff'
                };
                const root = document.documentElement;
                const body = document.body;
                root.style.setProperty('--primary', darkConfig.primary);
                root.style.setProperty('--primary-foreground', darkConfig.primaryForeground);
                root.style.setProperty('--secondary', darkConfig.secondary);
                root.style.setProperty('--secondary-foreground', darkConfig.secondaryForeground);
                root.style.setProperty('--accent', darkConfig.accent);
                root.style.setProperty('--accent-foreground', darkConfig.accentForeground);
                root.style.setProperty('--background', darkConfig.background);
                root.style.setProperty('--foreground', darkConfig.foreground);
                root.style.setProperty('--muted', darkConfig.muted);
                root.style.setProperty('--muted-foreground', darkConfig.mutedForeground);
                root.style.setProperty('--border', darkConfig.border);
                root.style.setProperty('--input', darkConfig.input);
                root.style.setProperty('--ring', darkConfig.ring);
                root.style.setProperty('--card', darkConfig.card);
                root.style.setProperty('--card-foreground', darkConfig.cardForeground);
                root.style.setProperty('--popover', darkConfig.popover);
                root.style.setProperty('--popover-foreground', darkConfig.popoverForeground);
                root.style.setProperty('--destructive', darkConfig.destructive);
                root.style.setProperty('--destructive-foreground', darkConfig.destructiveForeground);
                body.style.backgroundColor = darkConfig.background;
                body.style.color = darkConfig.foreground;
              })();
            `,
          }}
        />
      </head>
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
