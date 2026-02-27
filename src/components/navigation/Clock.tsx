"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"

export function Clock() {
  const [time, setTime] = useState(() => new Date())

  useEffect(() => {
    setTime(new Date())
    const interval = setInterval(() => {
      setTime(new Date())
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="text-muted-foreground text-sm">
      {format(time, "h:mm a")}
    </div>
  )
}
