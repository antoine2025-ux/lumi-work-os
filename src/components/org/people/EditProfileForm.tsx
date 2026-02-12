"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { orgTokens } from "@/components/org/ui/tokens"

type Props = {
  personId: string
  departments: Array<{ id: string; name: string }>
  teams: Array<{ id: string; name: string; departmentId: string }>
  initial: {
    name: string | null
    email: string | null
    title: string | null
    availability: string | null
    departmentId: string | null
    teamIds: string[]
    skills: string[]
    notes: string
  }
}

export function EditProfileForm(props: Props) {
  const router = useRouter()
  const [state, setState] = React.useState(props.initial)
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)

    try {
      const res = await fetch(`/api/org/people/${props.personId}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: state.title || null,
          availability: state.availability || null,
          departmentId: state.departmentId || null,
          teamIds: state.teamIds || [],
          skills: state.skills || [],
          notes: state.notes || "",
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const errorMessage = data.error || `Failed to save (HTTP ${res.status})`
        throw new Error(errorMessage)
      }

      setSaved(true)
      
      // Navigate back to people page after a brief delay to show "Saved" feedback
      setTimeout(() => {
        router.push("/org/directory")
      }, 500)
    } catch (e: any) {
      setError(e?.message || "Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  function field<K extends keyof typeof state>(key: K) {
    const value = state[key]
    return {
      value: typeof value === "string" ? value : Array.isArray(value) ? value.join(", ") : "",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const newValue = e.target.value
        setState({ ...state, [key]: newValue })
      },
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-sm text-muted-foreground">EDIT PROFILE</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Profile details</h1>
        <div className="mt-1 text-sm text-muted-foreground">
          Changes affect how this person appears across Org and Loopbrain.
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4">
          <div className="text-sm font-medium text-destructive">Error</div>
          <div className="mt-1 text-sm text-muted-foreground">{error}</div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Role / title</label>
          <input
            type="text"
            className={`${orgTokens.input} mt-1`}
            placeholder="e.g. Senior Engineer, Compliance Officer"
            value={state.title || ""}
            onChange={(e) => setState({ ...state, title: e.target.value || null })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Availability</label>
          <select
            className={`${orgTokens.input} mt-1`}
            value={state.availability || ""}
            onChange={(e) => setState({ ...state, availability: e.target.value || null })}
          >
            <option value="">Unknown</option>
            <option value="AVAILABLE">Available</option>
            <option value="LIMITED">Limited</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Skills</label>
          <input
            type="text"
            className={`${orgTokens.input} mt-1`}
            placeholder="e.g. React, AML, Risk analysis"
            value={state.skills.join(", ")}
            onChange={(e) => {
              const skills = e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
              setState({ ...state, skills })
            }}
          />
          <div className="mt-1 text-xs text-muted-foreground">
            Separate multiple skills with commas.
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            className={`${orgTokens.input} mt-1`}
            rows={4}
            placeholder="Optional context about this person..."
            value={state.notes || ""}
            onChange={(e) => setState({ ...state, notes: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t">
        <button
          onClick={handleSave}
          disabled={saving}
          className={orgTokens.button}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && !error && (
          <span className="text-sm text-muted-foreground">Saved</span>
        )}
        <button
          onClick={() => router.back()}
          className={orgTokens.buttonSecondary}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

