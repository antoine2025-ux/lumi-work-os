"use client"

export function OrgExportsScreen() {
  // Minimal shim so builds pass.
  // Replace with the real exports UI later (or wire to the new exports route).
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Exports</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Exports UI is being migrated. If you expected something here, ping the team.
      </p>
    </div>
  )
}
