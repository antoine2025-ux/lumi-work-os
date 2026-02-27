/**
 * Cached fetch for org people (mention suggestions).
 * 5-minute stale time to avoid refetching on every keystroke.
 */

const CACHE_MS = 5 * 60 * 1000

interface CachedPeople {
  data: MentionPerson[]
  timestamp: number
}

export interface MentionPerson {
  id: string
  userId: string
  fullName: string
  email: string | null
  title: string | null
  team: { id: string; name: string } | null
}

let cache: CachedPeople | null = null

export async function fetchPeopleForMentions(): Promise<MentionPerson[]> {
  if (cache && Date.now() - cache.timestamp < CACHE_MS) {
    return cache.data
  }

  const res = await fetch('/api/org/people')
  if (!res.ok) {
    throw new Error('Failed to fetch people')
  }

  const json = await res.json()
  if (!json?.ok || !json?.data?.people) {
    return []
  }

  const people = (json.data.people as Array<{
    id: string
    userId: string
    fullName: string
    email: string | null
    title: string | null
    team: { id: string; name: string } | null
  }>).map((p) => ({
    id: p.id,
    userId: p.userId,
    fullName: p.fullName,
    email: p.email ?? null,
    title: p.title ?? null,
    team: p.team ?? null,
  }))

  cache = { data: people, timestamp: Date.now() }
  return people
}
