"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RolePicker } from "@/components/org/people/RolePicker"
import { SkillPicker } from "@/components/org/people/SkillPicker"
import { orgTokens } from "@/components/org/ui/tokens"
import { OrgChip } from "@/components/org/ui/OrgChip"

type Profile = {
  person: { id: string; name: string; email: string | null; title: string | null }
  org: { teams: Array<{ id: string; name: string }>; managerIds: string[] }
  availability: { status: string; reason: string | null; updatedAt: string | null }
  roles: Array<{ role: string; percent: number }>
  skills: string[]
}

function summarize(list: string[], max = 6) {
  const shown = list.slice(0, max)
  const more = Math.max(0, list.length - shown.length)
  return { shown, more }
}

export function PersonProfilePanel(props: {
  personId: string | null
  onClose?: () => void
}) {
  const router = useRouter()
  const [profile, setProfile] = React.useState<Profile | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [edit, setEdit] = React.useState(false)
  const [draft, setDraft] = React.useState<any>(null)
  const [draftSkills, setDraftSkills] = React.useState<string[]>([])
  const [draftRoles, setDraftRoles] = React.useState<Array<{ role: string; percent: number }>>([])
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    const id = props.personId
    if (!id) {
      setProfile(null)
      setEdit(false)
      setDraft(null)
      setDraftSkills([])
      setDraftRoles([])
      return
    }

    setLoading(true)
    fetch(`/api/org/people/profile?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((j) => {
        setProfile(j.profile ?? null)
        setEdit(false)
        setDraft(null)
        setDraftSkills([])
        setDraftRoles([])
      })
      .finally(() => setLoading(false))
  }, [props.personId])

  if (!props.personId) {
    return null
  }

  const p = profile

  return (
    <div className={orgTokens.page}>
      <div className={orgTokens.sectionCard}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {loading ? (
              <div className="space-y-2">
                <div className="h-6 w-3/4 rounded bg-muted animate-pulse" />
                <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
              </div>
            ) : (
              <>
                <div className={`${orgTokens.heading} truncate`}>
                  {p?.person.name || "Person"}
                </div>
                <div className={`mt-1 ${orgTokens.subtleText}`}>
                  {p?.person.title ? p.person.title : "—"}
                  {p?.person.email ? ` · ${p.person.email}` : ""}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
          {!edit ? (
            <button
              className={orgTokens.button}
              disabled={!p}
              onClick={() => {
                if (!p) return
                setEdit(true)
                setDraft({
                  name: p.person.name,
                  title: p.person.title ?? "",
                  availabilityStatus: p.availability.status,
                  availabilityReason: p.availability.reason ?? "",
                })
                setDraftSkills(p.skills ?? [])
                setDraftRoles(p.roles && p.roles.length > 0 ? p.roles : [{ role: "", percent: 100 }])
              }}
            >
              Edit profile
            </button>
          ) : (
            <button
              className={orgTokens.button}
              onClick={() => {
                setEdit(false)
                setDraft(null)
                setDraftSkills([])
                setDraftRoles([])
              }}
            >
              Cancel
            </button>
          )}
          {props.onClose && (
            <button className={orgTokens.button} onClick={props.onClose}>
              Close
            </button>
          )}
        </div>
        </div>
      </div>

      {loading ? (
        <div className={orgTokens.grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={orgTokens.sectionCard}>
              <div className="h-4 w-1/3 rounded bg-muted animate-pulse mb-2" />
              <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className={orgTokens.grid}>
          <div className={orgTokens.sectionCard}>
            <div className={orgTokens.title}>Org placement</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {p?.org.teams?.length ? p.org.teams.map((t) => <OrgChip key={t.id}>{t.name}</OrgChip>) : <span className={orgTokens.subtleText}>No team</span>}
            </div>
          </div>

          <div className={orgTokens.sectionCard}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={orgTokens.title}>Availability</div>
                <div className={`mt-1 ${orgTokens.subtleText}`}>
                  {p ? `${p.availability.status}${p.availability.reason ? ` · ${p.availability.reason}` : ""}` : "—"}
                </div>
              </div>
              {p?.availability.updatedAt && <OrgChip>Updated</OrgChip>}
            </div>
          </div>

          <div className={orgTokens.sectionCard}>
            <div className={orgTokens.title}>Roles</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {p?.roles?.length
                ? p.roles.slice(0, 3).map((r, i) => <OrgChip key={i}>{`${r.role} · ${r.percent}%`}</OrgChip>)
                : <span className={orgTokens.subtleText}>No roles set</span>}
              {p?.roles?.length && p.roles.length > 3 ? <OrgChip>{`+${p.roles.length - 3} more`}</OrgChip> : null}
            </div>
          </div>

          <div className={orgTokens.sectionCard}>
            <div className={orgTokens.title}>Skills</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {p?.skills?.length ? (
                <>
                  {summarize(p.skills, 6).shown.map((s, i) => <OrgChip key={i}>{s}</OrgChip>)}
                  {summarize(p.skills, 6).more ? <OrgChip>{`+${summarize(p.skills, 6).more} more`}</OrgChip> : null}
                </>
              ) : (
                <span className={orgTokens.subtleText}>No skills set</span>
              )}
            </div>
          </div>
        </div>
      )}

      {edit && (
        <div className={`mt-4 ${orgTokens.sectionCard}`}>
          <div className={orgTokens.title}>Edit</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Name</div>
              <input className={`mt-1 ${orgTokens.input}`}
                value={draft?.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Title</div>
              <input className={`mt-1 ${orgTokens.input}`}
                value={draft?.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Availability</div>
              <select className={`mt-1 ${orgTokens.input}`}
                value={draft?.availabilityStatus ?? "AVAILABLE"}
                onChange={(e) => setDraft({ ...draft, availabilityStatus: e.target.value })}>
                <option value="AVAILABLE">Available</option>
                <option value="LIMITED">Limited</option>
                <option value="UNAVAILABLE">Unavailable</option>
              </select>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Reason (optional)</div>
              <input className={`mt-1 ${orgTokens.input}`}
                value={draft?.availabilityReason ?? ""} onChange={(e) => setDraft({ ...draft, availabilityReason: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <div className="text-xs font-medium text-muted-foreground">Skills</div>
              <div className="mt-1">
                <SkillPicker value={draftSkills} onChange={setDraftSkills} />
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs font-medium text-muted-foreground">Roles</div>
              <div className="mt-1 space-y-2">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Primary role</div>
                  <div className="grid grid-cols-[1fr_80px] gap-2">
                    <RolePicker
                      value={draftRoles[0]?.role ?? ""}
                      onChange={(v) => setDraftRoles([{ role: v, percent: 100 }, ...draftRoles.slice(1)])}
                      placeholder="Select primary role"
                    />
                    <input
                      type="number"
                      className={orgTokens.input}
                      value={draftRoles[0]?.percent ?? 100}
                      min={1}
                      max={200}
                      onChange={(e) => {
                        const pct = Number(e.target.value)
                        if (Number.isFinite(pct) && pct > 0 && pct <= 200) {
                          setDraftRoles([{ role: draftRoles[0]?.role ?? "", percent: pct }, ...draftRoles.slice(1)])
                        }
                      }}
                    />
                  </div>
                </div>
                {draftRoles.length < 3 && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setDraftRoles([...draftRoles, { role: "", percent: 20 }])}
                  >
                    + Add secondary role
                  </button>
                )}
                {draftRoles.slice(1).map((r, i) => (
                  <div key={i} className="grid grid-cols-[1fr_80px_auto] gap-2">
                    <RolePicker
                      value={r.role}
                      onChange={(v) => {
                        const next = [...draftRoles]
                        next[i + 1] = { role: v, percent: r.percent }
                        setDraftRoles(next)
                      }}
                      placeholder="Secondary role"
                    />
                    <input
                      type="number"
                      className={orgTokens.input}
                      value={r.percent}
                      min={1}
                      max={200}
                      onChange={(e) => {
                        const pct = Number(e.target.value)
                        if (Number.isFinite(pct) && pct > 0 && pct <= 200) {
                          const next = [...draftRoles]
                          next[i + 1] = { role: r.role, percent: pct }
                          setDraftRoles(next)
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={orgTokens.button}
                      onClick={() => setDraftRoles(draftRoles.filter((_, idx) => idx !== i + 1))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              className={orgTokens.button}
              disabled={saving}
              onClick={async () => {
                if (!p) return
                setSaving(true)
                try {
                  // Filter out empty roles
                  const roles = draftRoles.filter((r) => r.role && r.role.trim())

                  const res = await fetch("/api/org/people/update-profile", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      id: p.person.id,
                      name: draft.name,
                      title: draft.title ? draft.title : null,
                      availability: { status: draft.availabilityStatus, reason: draft.availabilityReason ? draft.availabilityReason : null },
                      skills: draftSkills,
                      roles,
                    }),
                  })
                  if (res.ok) {
                    setEdit(false)
                    setDraft(null)
                    setDraftSkills([])
                    setDraftRoles([])
                    router.refresh()
                    // re-fetch profile
                    const profileRes = await fetch(`/api/org/people/profile?id=${encodeURIComponent(p.person.id)}`);
                    // Check if response is JSON before parsing
                    const contentType = profileRes.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                      throw new Error('Response is not JSON');
                    }
                    const j = await profileRes.json();
                    setProfile(j.profile ?? null)
                  }
                } finally {
                  setSaving(false)
                }
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

