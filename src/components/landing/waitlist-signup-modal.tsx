"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, Loader2, XCircle } from "lucide-react"

interface WaitlistSignupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WaitlistSignupModal({ open, onOpenChange }: WaitlistSignupModalProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    linkedin: "",
    company: "",
  })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setMessage("")

    try {
      const response = await fetch("/api/waitlist/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          linkedin: formData.linkedin || undefined,
          company: formData.company || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus("success")
        setMessage(data.message || "Thank you for joining the waitlist! We'll be in touch soon.")
        // Reset form after a delay
        setTimeout(() => {
          setFormData({
            firstName: "",
            lastName: "",
            email: "",
            linkedin: "",
            company: "",
          })
          setStatus("idle")
          setMessage("")
          onOpenChange(false)
        }, 3000)
      } else {
        setStatus("error")
        setMessage(data.error || "Something went wrong. Please try again.")
      }
    } catch (error) {
      setStatus("error")
      setMessage("Network error. Please try again.")
    }
  }

  const handleClose = () => {
    if (status !== "loading") {
      onOpenChange(false)
      // Reset form when closing
      setTimeout(() => {
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          linkedin: "",
          company: "",
        })
        setStatus("idle")
        setMessage("")
      }, 200)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl">Join the Waitlist</DialogTitle>
          <DialogDescription className="text-slate-300">
            Get early access to Loopwell and help shape the future of workplace productivity.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-slate-300">
                First Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="John"
                value={formData.firstName}
                onChange={handleChange}
                required
                disabled={status === "loading"}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-slate-300">
                Last Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleChange}
                required
                disabled={status === "loading"}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-400"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">
              Email <span className="text-red-400">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="john.doe@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={status === "loading"}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin" className="text-slate-300">
              LinkedIn Profile <span className="text-slate-500 text-xs">(optional)</span>
            </Label>
            <Input
              id="linkedin"
              name="linkedin"
              type="url"
              placeholder="https://linkedin.com/in/johndoe"
              value={formData.linkedin}
              onChange={handleChange}
              disabled={status === "loading"}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company" className="text-slate-300">
              Company <span className="text-slate-500 text-xs">(optional)</span>
            </Label>
            <Input
              id="company"
              name="company"
              type="text"
              placeholder="Acme Inc."
              value={formData.company}
              onChange={handleChange}
              disabled={status === "loading"}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-400"
            />
          </div>

          {message && (
            <div
              className={`text-sm flex items-center gap-2 p-3 rounded-md ${
                status === "success"
                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                  : status === "error"
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : "text-slate-300"
              }`}
            >
              {status === "success" && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
              {status === "error" && <XCircle className="w-4 h-4 flex-shrink-0" />}
              <span>{message}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={status === "loading" || !formData.email || !formData.firstName || !formData.lastName}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Joining Waitlist...
              </>
            ) : (
              "Join Waitlist"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

