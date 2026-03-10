'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { NOTIFICATION_TYPES } from '@/lib/notifications/types'
import { Loader2 } from 'lucide-react'

interface NotificationPreference {
  notificationType: string
  enabled: boolean
}

interface PreferencesResponse {
  preferences: NotificationPreference[]
}

export function NotificationSettings() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading } = useQuery<PreferencesResponse>({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/preferences')
      if (!res.ok) throw new Error('Failed to fetch preferences')
      return res.json()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      notificationType,
      enabled,
    }: {
      notificationType: string
      enabled: boolean
    }) => {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationType, enabled }),
      })
      if (!res.ok) throw new Error('Failed to update preference')
      return res.json()
    },
    onMutate: async ({ notificationType, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ['notification-preferences'] })
      
      const previousData = queryClient.getQueryData<PreferencesResponse>([
        'notification-preferences',
      ])

      queryClient.setQueryData<PreferencesResponse>(
        ['notification-preferences'],
        (old) => {
          if (!old) return old
          return {
            preferences: old.preferences.map((p) =>
              p.notificationType === notificationType ? { ...p, enabled } : p
            ),
          }
        }
      )

      return { previousData }
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ['notification-preferences'],
          context.previousData
        )
      }
      toast({
        title: 'Error',
        description: 'Failed to update notification preference',
        variant: 'destructive',
      })
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Notification preference updated',
      })
    },
  })

  const handleToggle = (notificationType: string, enabled: boolean) => {
    updateMutation.mutate({ notificationType, enabled })
  }

  const preferencesMap = new Map(
    data?.preferences.map((p) => [p.notificationType, p.enabled])
  )

  const enabledCount = data?.preferences.filter((p) => p.enabled).length ?? 0

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose which notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Choose which notifications you want to receive ({enabledCount} of{' '}
              {NOTIFICATION_TYPES.length} enabled)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                NOTIFICATION_TYPES.forEach((type) => {
                  if (!preferencesMap.get(type.key)) {
                    handleToggle(type.key, true)
                  }
                })
              }}
            >
              Enable All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                NOTIFICATION_TYPES.forEach((type) => {
                  if (preferencesMap.get(type.key)) {
                    handleToggle(type.key, false)
                  }
                })
              }}
            >
              Disable All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {NOTIFICATION_TYPES.map((type) => {
          const enabled = preferencesMap.get(type.key) ?? true
          const isUpdating =
            updateMutation.isPending &&
            updateMutation.variables?.notificationType === type.key

          return (
            <div
              key={type.key}
              className="flex items-start justify-between gap-4 pb-4 border-b last:border-b-0 last:pb-0"
            >
              <div className="flex-1">
                <Label
                  htmlFor={`notification-${type.key}`}
                  className="text-base font-medium cursor-pointer"
                >
                  {type.label}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {type.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isUpdating && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                <Switch
                  id={`notification-${type.key}`}
                  checked={enabled}
                  onCheckedChange={(checked) => handleToggle(type.key, checked)}
                  disabled={isUpdating}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
