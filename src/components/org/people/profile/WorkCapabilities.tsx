"use client"

import Link from "next/link"
import { orgTokens } from "@/components/org/ui/tokens"

type Skill = {
  key: string
  label: string
  level?: "BASIC" | "WORKING" | "STRONG" | "EXPERT" | null
}

type WorkCapabilitiesProps = {
  personKey: string
  skills: { items: Skill[] }
  domains?: Array<{ id: string; name: string }> | null
  systems?: Array<{ id: string; name: string }> | null
}

function pill(text: string) {
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

export function WorkCapabilities(props: WorkCapabilitiesProps) {
  const { skills, domains, systems } = props
  const skillItems = skills?.items ?? []
  const hasSkills = skillItems.length > 0
  const hasDomains = domains && domains.length > 0
  const hasSystems = systems && systems.length > 0
  const hasData = hasSkills || hasDomains || hasSystems

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Work & Capabilities</h3>
        {hasSkills && (
          <Link className={orgTokens.link} href={`/org/people/${props.personKey}/edit?focus=skills`}>
            Edit
          </Link>
        )}
      </div>

      {hasData ? (
        <div className="space-y-3">
          {/* Skills */}
          {hasSkills && (
            <div>
              <div className="text-xs text-muted-foreground mb-2">Skills</div>
              <div className="flex flex-wrap gap-2">
                {skillItems.slice(0, 12).map((s) => {
                  const level = levelBadge(s.level)
                  const displayText = level ? `${s.label} · ${level}` : s.label
                  return (
                    <span key={s.key} className={pill(displayText)}>
                      {displayText}
                    </span>
                  )
                })}
                {skillItems.length > 12 && (
                  <Link
                    href={`/org/people/${props.personKey}/skills`}
                    className={pill(`+${skillItems.length - 12} more`)}
                  >
                    +{skillItems.length - 12} more
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Domains */}
          {hasDomains && (
            <div>
              <div className="text-xs text-muted-foreground mb-2">Primary Domains</div>
              <div className="flex flex-wrap gap-2">
                {domains!.map((d) => (
                  <span key={d.id} className={pill(d.name)}>
                    {d.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Systems */}
          {hasSystems && (
            <div>
              <div className="text-xs text-muted-foreground mb-2">Systems</div>
              <div className="flex flex-wrap gap-2">
                {systems!.map((s) => (
                  <span key={s.id} className={pill(s.name)}>
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          <Link href={`/org/people/${props.personKey}/edit?focus=skills`} className="text-primary hover:underline">
            Add skills
          </Link> to make this person discoverable.
        </div>
      )}
    </div>
  )
}

