"use client";

import { useEffect, useState } from "react";
import { RoleCard } from "./_components/RoleCard";
import { EditRoleDrawer } from "./_components/EditRoleDrawer";
import Link from "next/link";

type Role = {
  id: string;
  name: string;
  description: string | null;
  responsibilities: Array<{
    id: string;
    scope: string;
    target: string;
  }>;
};

export default function OrgRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  useEffect(() => {
    async function loadRoles() {
      try {
        setLoading(true);
        const res = await fetch("/api/org/roles");
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.roles)) {
            setRoles(data.roles);
          }
        }
      } catch (error) {
        console.error("Error loading roles:", error);
      } finally {
        setLoading(false);
      }
    }

    loadRoles();
  }, []);

  async function handleSaveRole(roleData: { name: string; responsibilities: Array<{ scope: string; target: string }> }) {
    try {
      if (editingRole) {
        // Update existing role
        const res = await fetch(`/api/org/roles/${editingRole.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(roleData),
        });

        if (!res.ok) {
          throw new Error("Failed to update role");
        }
      } else {
        // Create new role
        const res = await fetch("/api/org/roles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(roleData),
        });

        if (!res.ok) {
          throw new Error("Failed to create role");
        }
      }

      // Reload roles
      const reloadRes = await fetch("/api/org/roles");
      if (reloadRes.ok) {
        const reloadData = await reloadRes.json();
        if (reloadData.ok && Array.isArray(reloadData.roles)) {
          setRoles(reloadData.roles);
        }
      }
    } catch (error) {
      console.error("Error saving role:", error);
      alert("Failed to save role. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Org • Roles</p>
        <h1 className="text-3xl font-bold">Roles</h1>
        <p className="text-sm text-muted-foreground">
          Defines what roles own, decide, and work on.
        </p>
      </header>

      {loading ? (
        <div className="text-center text-sm text-muted-foreground">Loading roles...</div>
      ) : (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingRole(null);
                setEditOpen(true);
              }}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              Create role
            </button>
          </div>

          {roles.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No roles defined yet. Create your first role to define responsibilities.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {roles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  onEdit={() => {
                    setEditingRole(role);
                    setEditOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      <EditRoleDrawer
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditingRole(null);
        }}
        role={editingRole || undefined}
        onSave={handleSaveRole}
      />
    </div>
  );
}

