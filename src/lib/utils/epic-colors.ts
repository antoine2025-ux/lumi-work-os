/**
 * Epic Color Utilities
 * 
 * Generates consistent colors from epic titles when no color is set.
 * This ensures visual consistency across the application while respecting
 * user-defined epic colors when available.
 */

/**
 * Generates a consistent color from a string (epic title)
 * Uses a simple hash function to convert the string to a color
 * 
 * @param title - The epic title to generate a color from
 * @returns A hex color string (e.g., "#3B82F6")
 */
export function generateColorFromString(title: string): string {
  if (!title || title.trim().length === 0) {
    return '#94A3B8' // Default slate-400 for empty strings
  }

  // Simple hash function to convert string to number
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    const char = title.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }

  // Use HSL color space for better color distribution
  // Fixed saturation (60%) and lightness (55%) for consistent appearance
  const hue = Math.abs(hash) % 360
  const saturation = 60
  const lightness = 55

  // Convert HSL to RGB, then to hex
  const h = hue / 360
  const s = saturation / 100
  const l = lightness / 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h * 6) % 2 - 1))
  const m = l - c / 2

  let r = 0, g = 0, b = 0

  if (h < 1/6) {
    r = c; g = x; b = 0
  } else if (h < 2/6) {
    r = x; g = c; b = 0
  } else if (h < 3/6) {
    r = 0; g = c; b = x
  } else if (h < 4/6) {
    r = 0; g = x; b = c
  } else if (h < 5/6) {
    r = x; g = 0; b = c
  } else {
    r = c; g = 0; b = x
  }

  r = Math.round((r + m) * 255)
  g = Math.round((g + m) * 255)
  b = Math.round((b + m) * 255)

  return `#${[r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')}`
}

/**
 * Gets the color for an epic, using the epic's color if available,
 * otherwise generating one from the title
 * 
 * @param epic - Epic object with optional color and title
 * @returns A hex color string
 */
export function getEpicColor(epic: { color?: string | null; title: string } | null | undefined): string {
  if (!epic) {
    return '#94A3B8' // Default grey for no epic
  }

  if (epic.color && epic.color.trim().length > 0) {
    return epic.color
  }

  return generateColorFromString(epic.title)
}



