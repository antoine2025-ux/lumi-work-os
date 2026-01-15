export default function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-muted/40">
        <div className="container mx-auto px-4 py-2">
          <p className="text-sm text-muted-foreground">
            ⚠️ Dev-only tools. Not for production.
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

