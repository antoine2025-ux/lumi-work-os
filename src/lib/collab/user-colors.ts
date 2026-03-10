/**
 * Deterministic user colors for collaboration cursors and presence.
 * Same userId always gets the same color across sessions.
 */

export const COLLAB_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // emerald
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#6366F1', // indigo
  '#14B8A6', // teal
]

/**
 * Returns a deterministic color for a userId.
 * Same userId always returns the same color.
 */
export function getUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLLAB_COLORS[Math.abs(hash) % COLLAB_COLORS.length]
}
