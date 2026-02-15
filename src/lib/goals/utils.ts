/**
 * Goals Utilities
 * 
 * Client-safe utility functions for goals (no Prisma/database dependencies).
 */

/**
 * Get current quarter string (e.g., "2026-Q1")
 */
export function getCurrentQuarter(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const quarter = Math.ceil(month / 3)
  return `${year}-Q${quarter}`
}

/**
 * Get available quarters for selection
 */
export function getAvailableQuarters(yearsBack: number = 2): string[] {
  const now = new Date()
  const currentYear = now.getFullYear()
  const quarters: string[] = []
  
  for (let year = currentYear - yearsBack; year <= currentYear + 1; year++) {
    for (let q = 1; q <= 4; q++) {
      quarters.push(`${year}-Q${q}`)
    }
  }
  
  return quarters
}
