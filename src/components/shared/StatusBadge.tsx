import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
  {
    variants: {
      status: {
        active:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
        away: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
        offline:
          "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
        onTrack:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
        atRisk:
          "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
        inProgress:
          "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
        inReview:
          "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
        todo: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
      },
    },
    defaultVariants: {
      status: "offline",
    },
  }
)

export type StatusBadgeVariant = NonNullable<
  VariantProps<typeof statusBadgeVariants>["status"]
>

const STATUS_LABELS: Record<StatusBadgeVariant, string> = {
  active: "Active",
  away: "Away",
  offline: "Offline",
  onTrack: "On Track",
  atRisk: "At Risk",
  inProgress: "In Progress",
  inReview: "In Review",
  todo: "Todo",
}

export interface StatusBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  status: StatusBadgeVariant
  children?: React.ReactNode
}

export function StatusBadge({
  status,
  children,
  className,
  ...props
}: StatusBadgeProps) {
  const label = children ?? STATUS_LABELS[status]
  return (
    <span
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    >
      {label}
    </span>
  )
}
