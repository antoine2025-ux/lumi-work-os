interface PageHeaderProps {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">
          {title}
        </h1>
        {description != null && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {actions != null && (
        <div className="flex items-center gap-2">{actions}</div>
      )}
    </div>
  )
}
