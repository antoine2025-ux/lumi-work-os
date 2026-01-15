"use client"

import * as React from "react"

export function RolePicker(props: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [q, setQ] = React.useState("")
  const [items, setItems] = React.useState<string[]>([])
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const qq = q.trim()
    fetch(`/api/org/taxonomy/roles?q=${encodeURIComponent(qq)}&take=8`)
      .then((r) => r.json())
      .then((j) => setItems(j.roles ?? []))
      .catch(() => setItems([]))
  }, [q])

  return (
    <div className="relative">
      <input
        className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
        value={open ? q : props.value}
        placeholder={props.placeholder ?? "Role"}
        onFocus={() => {
          setOpen(true)
          setQ("")
        }}
        onChange={(e) => setQ(e.target.value)}
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
                props.onChange(it)
                setOpen(false)
              }}
            >
              {it}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

