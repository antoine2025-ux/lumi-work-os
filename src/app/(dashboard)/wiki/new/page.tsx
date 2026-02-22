"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * /wiki/new redirects into the layout's create flow for a single, no-refresh creation path.
 * The layout's triggerCreatePage shows the workspace dialog, then the inline editor.
 */
export default function NewWikiPage() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const trigger = (window as unknown as { triggerCreatePage?: () => void }).triggerCreatePage
    if (trigger) {
      trigger()
      router.replace('/wiki')
    } else {
      router.replace('/wiki')
    }
  }, [router])

  return null
}
