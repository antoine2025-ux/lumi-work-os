"use client"

import { useSession } from "next-auth/react"
import { useCalendarEvents } from "@/hooks/use-calendar-events"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { signIn } from "next-auth/react"

export default function CalendarTestPage() {
  const { data: session, status } = useSession()
  const { events, isLoading, error, needsAuth, refetch } = useCalendarEvents()

  if (status === "loading") {
    return <div>Loading session...</div>
  }

  if (!session) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Calendar Integration Test</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">You need to be logged in to test the calendar integration.</p>
            <Button onClick={() => signIn('google')}>
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Calendar Integration Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Session Info:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Calendar Status:</h3>
            <div className="space-y-2">
              <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
              <p><strong>Error:</strong> {error || 'None'}</p>
              <p><strong>Needs Auth:</strong> {needsAuth ? 'Yes' : 'No'}</p>
              <p><strong>Events Count:</strong> {events.length}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Events:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm max-h-96 overflow-auto">
              {JSON.stringify(events, null, 2)}
            </pre>
          </div>

          <Button onClick={refetch} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh Events'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
