"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import {
  Bell,
  Check,
  Info,
  MessageSquare,
  UserPlus,
  AtSign,
  Brain,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationActor {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  url: string | null
  read: boolean
  createdAt: string
  actor: NotificationActor | null
}

interface NotificationsListResponse {
  notifications: Notification[]
  unreadCount: number
  hasMore: boolean
  nextCursor: string | null
}

interface UnreadCountResponse {
  count: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNotificationIcon(type: string) {
  switch (type) {
    case "task.assigned":
      return <UserPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
    case "comment":
    case "comment_added":
      return <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
    case "mention":
      return <AtSign className="h-4 w-4 shrink-0 text-muted-foreground" />
    case "loopbrain.insight":
      return <Brain className="h-4 w-4 shrink-0 text-muted-foreground" />
    default:
      return <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationCenter() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: unreadData } = useQuery<UnreadCountResponse>({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/unread-count")
      if (!res.ok) throw new Error("Failed to fetch unread count")
      return res.json()
    },
    refetchInterval: 30_000,
  })

  const { data: listData, isLoading } = useQuery<NotificationsListResponse>({
    queryKey: ["notifications", "list"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?limit=20")
      if (!res.ok) throw new Error("Failed to fetch notifications")
      return res.json()
    },
    enabled: open,
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      })
      if (!res.ok) throw new Error("Failed to mark all as read")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
      })
      if (!res.ok) throw new Error("Failed to mark as read")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const unreadCount = unreadData?.count ?? 0
  const notifications = listData?.notifications ?? []

  const handleNotificationClick = (notification: Notification) => {
    if (notification.url) {
      router.push(notification.url)
    }
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative flex items-center justify-center rounded-lg p-2 text-muted-foreground",
            "hover:bg-muted hover:text-foreground transition-colors"
          )}
          aria-label="Notifications"
          aria-expanded={open}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground"
              aria-hidden
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        sideOffset={8}
      >
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
              >
                Mark all as read
              </Button>
            )}
          </div>
          <ScrollArea className="max-h-[400px]">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-10 w-10 shrink-0 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
                <Check className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  You&apos;re all caught up
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    className={cn(
                      "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      !notification.read && "border-l-2 border-l-primary bg-muted/30"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {getNotificationIcon(notification.type)}
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm",
                          !notification.read ? "font-semibold" : "font-normal"
                        )}
                      >
                        {notification.title}
                      </p>
                      {notification.body && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {notification.body}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  )
}
