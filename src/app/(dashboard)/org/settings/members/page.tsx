"use client";

import React, { useEffect, useState } from "react";
import { SettingsNav } from "../_components/SettingsNav";

type Member = {
  id: string;
  userId: string;
  role: "VIEWER" | "EDITOR" | "ADMIN";
};

export default function OrgMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/org/members");
      const data = await res.json();
      if (data?.ok) setMembers(data.members);
      setLoading(false);
    })();
  }, []);

  async function updateRole(userId: string, role: Member["role"]) {
    await fetch("/api/org/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    setMembers((prev) =>
      prev.map((m) => (m.userId === userId ? { ...m, role } : m))
    );
  }

  return (
    <div className="px-6 py-6">
      <div className="max-w-3xl space-y-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <SettingsNav role={role} />
          </div>
          <div className="lg:col-span-3 space-y-6">
            <div>
              <h1 className="text-xl font-semibold">Org members</h1>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                Manage access and roles for this organization.
              </p>
            </div>

            {loading ? (
              <div className="text-sm text-black/60 dark:text-white/60">Loading…</div>
            ) : (
              <div className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                {members.length === 0 ? (
                  <div className="text-sm text-black/60 dark:text-white/60">No members found.</div>
                ) : (
                  members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between border-t border-black/5 py-3 first:border-t-0 dark:border-white/5"
                    >
                      <div className="text-sm">
                        <div className="font-medium">{m.userId}</div>
                        <div className="text-xs text-black/50 dark:text-white/50">
                          Member
                        </div>
                      </div>
                      <select
                        value={m.role}
                        onChange={(e) => updateRole(m.userId, e.target.value as Member["role"])}
                        className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black"
                      >
                        <option value="VIEWER">Viewer</option>
                        <option value="EDITOR">Editor</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

