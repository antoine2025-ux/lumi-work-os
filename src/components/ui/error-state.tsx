import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
  fullPage?: boolean
}

export function ErrorState({
  title = "Something went wrong",
  description = "Please try refreshing the page",
  onRetry,
  className,
  fullPage = false,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-muted-foreground",
        fullPage ? "min-h-[400px]" : "py-12",
        className
      )}
    >
      <AlertCircle className="h-8 w-8 mb-3" />
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-xs mt-1">{description}</p>}
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onRetry}
        >
          Retry
        </Button>
      )}
    </div>
  )
}
