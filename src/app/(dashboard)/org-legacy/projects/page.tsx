"use client";

import { useEffect, useState } from "react";
import { ProjectAccountabilityPanel } from "./_components/ProjectAccountabilityPanel";
import { EditProjectAccountabilityDrawer } from "./_components/EditProjectAccountabilityDrawer";

type ProjectWithAccountability = {
  id: string;
  name: string;
  description: string | null;
  orgId: string;
  accountability?: {
    ownerPersonId?: string;
    ownerPerson?: string;
    ownerRole?: string;
    decisionPersonId?: string;
    decisionPerson?: string;
    decisionRole?: string;
    escalationPersonId?: string;
    escalationPerson?: string;
    escalationRole?: string;
    backupOwnerPersonId?: string;
    backupOwnerPerson?: string;
    backupOwnerRole?: string;
    backupDecisionPersonId?: string;
    backupDecisionPerson?: string;
    backupDecisionRole?: string;
  } | null;
  allocations?: Array<{
    id: string;
    personId: string;
    personName: string;
    fraction: number;
    startDate: string;
    endDate?: string | null;
  }>;
};

type Person = {
  id: string;
  name: string;
};

export default function OrgProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithAccountability[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Fetch projects with accountability
        const projectsRes = await fetch("/api/org/projects");
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          setProjects(projectsData.projects || []);
        }

        // Fetch people for dropdown
        const peopleRes = await fetch("/api/org/people");
        if (peopleRes.ok) {
          const peopleData = await peopleRes.json();
          if (peopleData.ok && Array.isArray(peopleData.people)) {
            const peopleList = peopleData.people.map((p: any) => ({
              id: p.id,
              name: p.name || p.fullName || "Unnamed person",
            }));
            setPeople(peopleList);
          }
        }
      } catch (error) {
        console.error("Error loading projects:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleSaveAccountability(projectId: string, accountability: any) {
    try {
      const res = await fetch(`/org/api/projects/${projectId}/accountability`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(accountability),
      });

      if (!res.ok) {
        throw new Error("Failed to save accountability");
      }

      // Reload projects to get updated data
      const projectsRes = await fetch("/api/org/projects");
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData.projects || []);
      }
    } catch (error) {
      console.error("Error saving accountability:", error);
      alert("Failed to save accountability. Please try again.");
    }
  }

  const editingProject = editingProjectId
    ? projects.find((p) => p.id === editingProjectId)
    : null;

  // Build personId -> name map for name resolution
  const personNameMap = new Map<string, string>();
  people.forEach((person) => {
    personNameMap.set(person.id, person.name);
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Org • Accountability
          </p>
          <h1 className="text-3xl font-bold">Projects</h1>
        </header>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Org • Accountability
        </p>
        <h1 className="text-3xl font-bold">Projects</h1>
        <p className="text-sm text-muted-foreground">
          Defines who owns, decides, and escalates for this project.
        </p>
        <p className="text-xs text-muted-foreground">
          Allocated people and their capacity are shown in People.
        </p>
      </header>

      {/* Empty state */}
      {projects.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No projects found for this organization yet.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group rounded-md border bg-card p-6 shadow-sm transition hover:border-primary/50"
            >
              <header className="mb-4">
                <h2 className="text-lg font-semibold leading-tight">{project.name}</h2>
                {project.description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>
                )}
              </header>

              <div className="mt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Accountability
                  </h3>
                  <button
                    onClick={() => {
                      setEditingProjectId(project.id);
                      setEditOpen(true);
                    }}
                    className="text-xs underline text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
                  >
                    Edit accountability
                  </button>
                </div>
                <ProjectAccountabilityPanel
                  accountability={project.accountability || undefined}
                  personNameMap={personNameMap}
                />
                <p className="mt-3 text-xs text-black/40 dark:text-white/40">
                  Accountability is explicit and separate from reporting lines.
                </p>
                <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                  Coverage is optional but helps continuity during absence.
                </p>

                {/* Allocated People */}
                {project.allocations && project.allocations.length > 0 && (
                  <div className="mt-4">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Allocated people
                    </h3>
                    <div className="space-y-2">
                      {project.allocations.map((alloc) => (
                        <div
                          key={alloc.id}
                          className="rounded-lg border border-black/10 bg-black/5 p-2 text-xs dark:border-white/10 dark:bg-white/5"
                        >
                          <div className="font-medium">
                            {alloc.personName} ({Math.round(alloc.fraction * 100)}%)
                          </div>
                          <div className="mt-1 text-black/50 dark:text-white/50">
                            {new Date(alloc.startDate).toLocaleDateString()}
                            {alloc.endDate ? ` – ${new Date(alloc.endDate).toLocaleDateString()}` : " (ongoing)"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editingProject && (
        <EditProjectAccountabilityDrawer
          open={editOpen}
          onClose={() => {
            setEditOpen(false);
            setEditingProjectId(null);
          }}
          value={{
            ownerPersonId: editingProject.accountability?.ownerPersonId,
            ownerRole: editingProject.accountability?.ownerRole,
            decisionPersonId: editingProject.accountability?.decisionPersonId,
            decisionRole: editingProject.accountability?.decisionRole,
            escalationPersonId: editingProject.accountability?.escalationPersonId,
            escalationRole: editingProject.accountability?.escalationRole,
          }}
          people={people}
          onSave={(next) => {
            handleSaveAccountability(editingProject.id, next);
          }}
        />
      )}
    </div>
  );
}
