import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: "Loopwell - Intelligent Workplace Platform",
  description: "A calm, minimal platform for companies to manage knowledge, onboarding, and workflows with AI-powered intelligence",
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
      <body className={`${montserrat.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
