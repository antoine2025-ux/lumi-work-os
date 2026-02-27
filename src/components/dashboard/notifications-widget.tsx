"use client"

import { Card } from "@/components/ui/card"
import { Bell } from "lucide-react"

interface NotificationsWidgetProps {
  className?: string
}

export function NotificationsWidget({ className }: NotificationsWidgetProps) {
  return (
    <Card className={`widget-card ${className || ''}`}>
      <div className="widget-header">
        <div className="widget-header-start">
          <Bell className="h-4 w-4 flex-shrink-0" aria-hidden />
          <span className="widget-title">NOTIFICATIONS</span>
        </div>
        <div className="widget-actions"></div>
      </div>
      <div className="widget-content">
        <div className="text-center py-8">
          <Bell className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No new notifications</p>
        </div>
      </div>
    </Card>
  )
}