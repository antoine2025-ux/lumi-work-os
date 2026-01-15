export function normalizeLabel(s: string) {
  return s.trim().replace(/\s+/g, " ")
}

export function normalizeSkill(s: string) {
  return normalizeLabel(s).toLowerCase()
}

export function normalizeRole(s: string) {
  return normalizeLabel(s)
}

