export type ImportError = { row: number; field?: string; message: string }
export type ImportPreview<T> = {
  ok: boolean
  entity: string
  count: number
  sample: T[]
  errors: ImportError[]
}

export function required(v: string, name: string, row: number, errors: ImportError[]) {
  if (!String(v ?? "").trim()) errors.push({ row, field: name, message: "Required" })
}

export function asPercent(v: string, row: number, field: string, errors: ImportError[]) {
  if (!v) return 100
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0 || n > 100) {
    errors.push({ row, field, message: "Must be a number between 1 and 100" })
    return 100
  }
  return n
}

export function asFte(v: string, row: number, field: string, errors: ImportError[]) {
  if (!v) return 1
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0 || n > 2) {
    errors.push({ row, field, message: "Must be a number between 0 and 2" })
    return 1
  }
  return n
}

export function asShrinkage(v: string, row: number, field: string, errors: ImportError[]) {
  if (!v) return 20
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0 || n > 95) {
    errors.push({ row, field, message: "Must be a number between 0 and 95" })
    return 20
  }
  return n
}

