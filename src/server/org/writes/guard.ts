export function assertWriteAllowed(label: string) {
  // One choke point for future policy (roles, env flags, etc.)
  if (process.env.ORG_WRITES_DISABLED === "1") {
    throw new Error(`Org writes disabled: ${label}`)
  }
}

