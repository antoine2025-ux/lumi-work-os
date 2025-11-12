"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle, Loader2, Mail, Sparkles } from "lucide-react"

export function EarlyTesterSignup() {
  const [name, setName] = useState("")
  const [companyName, setCompanyName] = useState("")
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
        body: JSON.stringify({ 
          email,
          name,
          companyName 
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus("success")
        setMessage(data.message || "Welcome to the early tester community! We'll be in touch soon.")
        setName("")
        setCompanyName("")
        setEmail("")
      } else {
        setStatus("error")
        setMessage(data.error || "Something went wrong. Please try again.")
      }
    } catch (error) {
      setStatus("error")
      setMessage("Network error. Please try again.")
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={status === "loading"}
          className="bg-white/10 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-400"
        />
        <Input
          type="text"
          placeholder="Company name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
          disabled={status === "loading"}
          className="bg-white/10 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-400"
        />
        <Input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={status === "loading"}
          className="bg-white/10 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-400"
        />
        <Button
          type="submit"
          disabled={status === "loading" || !email || !name || !companyName}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Joining...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Join Early Access
            </>
          )}
        </Button>
        {message && (
          <div
            className={`text-sm flex items-center gap-2 ${
              status === "success"
                ? "text-green-400"
                : status === "error"
                ? "text-red-400"
                : "text-slate-300"
            }`}
          >
            {status === "success" && <CheckCircle className="w-4 h-4" />}
            {message}
          </div>
        )}
      </form>
    </div>
  )
}

