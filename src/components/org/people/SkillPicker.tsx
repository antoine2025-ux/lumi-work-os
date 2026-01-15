"use client"

import * as React from "react"

export function SkillPicker(props: {
  value: string[]
  onChange: (v: string[]) => void
}) {
  const [q, setQ] = React.useState("")
  const [items, setItems] = React.useState<string[]>([])
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const qq = q.trim()
    if (!qq) {
      setItems([])
      return
    }
    fetch(`/api/org/taxonomy/skills?q=${encodeURIComponent(qq)}&take=8`)
      .then((r) => r.json())
      .then((j) => setItems(j.skills ?? []))
      .catch(() => setItems([]))
  }, [q])

  function add(x: string) {
    const next = Array.from(new Set([...(props.value ?? []), x.trim()].filter(Boolean))).slice(0, 50)
    props.onChange(next)
    setQ("")
    setOpen(false)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(props.value ?? []).map((s) => (
          <button
            key={s}
            className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
            onClick={() => props.onChange((props.value ?? []).filter((x) => x !== s))}
            type="button"
          >
            {s} ×
          </button>
        ))}
      </div>

      <div className="relative mt-2">
        <input
          className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
          placeholder="Add a skill…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              if (q.trim()) add(q.trim())
            }
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />

        {open && items.length > 0 && (
          <div className="absolute z-20 mt-2 w-full rounded-2xl border bg-background p-2 shadow-sm">
            {items.map((it) => (
              <button
                key={it}
                className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault()
                  add(it)
                }}
                type="button"
              >
                {it}
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

