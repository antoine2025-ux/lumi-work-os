"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle, Loader2, Mail } from "lucide-react"

export function NewsletterSignup() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setMessage("")

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus("success")
        setMessage(data.message || "Successfully subscribed! Check your email.")
        setEmail("")
      } else {
        setStatus("error")
        setMessage(data.error || "Something went wrong. Please try again.")
      }
    } catch (_error) {
      setStatus("error")
      setMessage("Network error. Please try again.")
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={status === "loading"}
            className="flex-1 px-3 py-2 text-sm bg-landing-surface border-landing-border text-landing-text placeholder:text-landing-text-muted focus:ring-2 focus:ring-landing-accent/50"
          />
          <Button
            type="submit"
            disabled={status === "loading" || !email}
            className="inline-flex items-center gap-2 px-4 py-2 bg-landing-accent hover:bg-landing-accent-hover text-white text-sm font-medium whitespace-nowrap"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Subscribing...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Subscribe
              </>
            )}
          </Button>
        </div>
        {message && (
          <div
            className={`text-xs flex items-center gap-2 ${
              status === "success"
                ? "text-green-500"
                : status === "error"
                ? "text-red-500"
                : "text-landing-text-secondary"
            }`}
          >
            {status === "success" && <CheckCircle className="w-3.5 h-3.5" />}
            {message}
          </div>
        )}
      </form>
    </div>
  )
}

