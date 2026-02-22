"use client"

import Link from "next/link"
import { orgTokens } from "@/components/org/ui/tokens"

type Skill = {
  key: string
  label: string
  level?: "BASIC" | "WORKING" | "STRONG" | "EXPERT" | null
}

function pill(_text: string) {
  return "inline-flex items-center rounded-full border px-3 py-1 text-xs text-muted-foreground"
}

function levelBadge(level?: Skill["level"]) {
  if (!level) return null
  const map: Record<string, string> = {
    BASIC: "Basic",
    WORKING: "Working",
    STRONG: "Strong",
    EXPERT: "Expert",
  }
  return map[level] ?? null
}

export function SkillsSection(props: { personKey: string; skills: { items: Skill[] } }) {
  const items = props.skills?.items ?? []
  const top = items.slice(0, 12)

  return (
    <div className="py-4 border-b">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">Skills</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Used by Loopbrain to find who can do what.</p>
        </div>
        <Link className={orgTokens.link} href={`/org/people/${props.personKey}/edit?focus=skills`}>
          Edit skills
        </Link>
      </div>

      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {top.map((s) => {
            const level = levelBadge(s.level)
            const displayText = level ? `${s.label} · ${level}` : s.label
            return (
              <span key={s.key} className={pill(displayText)}>
                {displayText}
              </span>
            )
          })}
          {items.length > top.length ? (
            <Link
              href={`/org/people/${props.personKey}/skills`}
              className={pill(`+${items.length - top.length} more`)}
            >
              +{items.length - top.length} more
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          No skills yet. <Link href={`/org/people/${props.personKey}/edit?focus=skills`} className="text-primary hover:underline">Add skills</Link> to make this person discoverable.
        </div>
      )}
    </div>
  )
}

