import Link from "next/link";

export default function OrgRoleCardsPage() {
  return (
    <div className="p-8 space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Org · Role Cards
        </p>
        <h1 className="text-3xl font-bold">Role Cards</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Definitions of roles, responsibilities, and expected outcomes. Will
          later be backed by real RoleCard data.
        </p>
      </header>

      <div className="rounded-lg border bg-background/60 p-4">
        <p className="text-sm text-muted-foreground">
          Role cards are not connected yet.
        </p>
      </div>

      <Link href="/org" className="text-sm text-primary hover:underline">
        ← Back to Org overview
      </Link>
    </div>
  );
}
