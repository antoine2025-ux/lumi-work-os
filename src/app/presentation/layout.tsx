import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Loopwell Presentation",
  description: "Discover Loopwell - the unified workspace that brings projects, documentation, and team intelligence together through Organizational Intelligence.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function PresentationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}



