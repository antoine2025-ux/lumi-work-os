"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PersonRolesCard } from "@/components/org/PersonRolesCard";
import { OrgPersonLoopbrainPanel } from "@/components/org/OrgPersonLoopbrainPanel";

type PersonPosition = {
  id: string;
  title: string;
  level: number;
};

type PersonTeam = {
  id: string;
  name: string;
};

type PersonDepartment = {
  id: string;
  name: string;
};

type PersonDetailDto = {
  id: string;
  name: string;
  email: string;
  position: PersonPosition | null;
  team: PersonTeam | null;
  department: PersonDepartment | null;
};

type PersonResponse =
  | { ok: true; person: PersonDetailDto }
  | { ok: false; error: string };

export default function OrgPersonDetailPage() {
  const params = useParams();
  const personId = params?.id as string;

  const [person, setPerson] = useState<PersonDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!personId) return;
    let cancelled = false;

    async function loadPerson() {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch(`/api/org/people/${personId}`);
        const json = (await res.json()) as PersonResponse;

        if (!res.ok || !("ok" in json) || !json.ok) {
          const message =
            "error" in json && json.error
              ? json.error
              : "Failed to load person";
          if (!cancelled) {
            setError(message);
          }
          return;
        }

        if (!cancelled) {
          setPerson(json.person);
        }
      } catch (err) {
        console.error("Error fetching org person:", err);
        if (!cancelled) {
          setError("Unexpected error while loading person");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPerson();

    return () => {
      cancelled = true;
    };
  }, [personId]);

  return (
    <div className="p-8 space-y-6">
      {/* Breadcrumb / navigation */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <Link
            href="/org/people"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            ← Back to people
          </Link>
          <Link
            href="/org"
            className="inline-flex items-center gap-1 text-muted-foreground hover:underline"
          >
            Org overview
          </Link>
        </div>
      </div>

      {/* Loading / error */}
      {isLoading && (
        <header className="space-y-2">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-80 animate-pulse rounded bg-muted" />
        </header>
      )}

      {!isLoading && error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!isLoading && !error && person && (
        <>
          {/* Header */}
          <header className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Org • Person
            </p>
            <h1 className="text-2xl font-semibold">{person.name}</h1>
            <p className="text-sm text-muted-foreground">{person.email}</p>
          </header>

          {/* Org context card */}
          <section className="rounded-lg border bg-card px-4 py-3 text-xs">
            <h2 className="text-sm font-semibold">Org context</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Position</p>
                {person.position ? (
                  <p className="text-sm font-medium">
                    {person.position.title}
                    {person.position.level != null && (
                      <span className="ml-1 text-[11px] text-muted-foreground">
                        (Level {person.position.level})
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Not linked to a position yet.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Team</p>
                {person.team ? (
                  <Link
                    href={`/org/teams/${person.team.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {person.team.name}
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No team linked.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">
                  Department
                </p>
                {person.department ? (
                  <Link
                    href={`/org/departments/${person.department.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {person.department.name}
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No department linked.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Person Roles Card */}
          <PersonRolesCard personContextId={`person:${person.id}`} />

          {/* Person Loopbrain Panel */}
          <OrgPersonLoopbrainPanel personId={person.id} personName={person.name} />
        </>
      )}
    </div>
  );
}

