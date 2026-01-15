export type CsvParseResult = {
  headers: string[]
  rows: Array<Record<string, string>>
}

function splitCsvLine(line: string) {
  // Minimal CSV splitter with quotes support (no external deps)
  const out: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      const next = line[i + 1]
      if (inQuotes && next === '"') {
        cur += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === "," && !inQuotes) {
      out.push(cur)
      cur = ""
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

export function parseCsv(text: string): CsvParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = splitCsvLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "")) // strip BOM
  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line)
    const rec: Record<string, string> = {}
    for (let i = 0; i < headers.length; i++) rec[headers[i]] = cells[i] ?? ""
    return rec
  })

  return { headers, rows }
}

