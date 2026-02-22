"use client";

import { useEffect, useState } from "react";
import type { OrgCapability } from "@/lib/org/capabilities";
import { ORG_CAPABILITY_DESCRIPTIONS } from "@/lib/org/capabilities";

type CustomRole = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  capabilities: OrgCapability[];
};

export function CustomRolesSection() {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    key: "",
    name: "",
    description: "",
    capabilities: [] as OrgCapability[],
  });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/org/custom-roles");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to load custom roles.");
      }
      const data = await res.json();
      setRoles(data.roles ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load custom roles.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggleCapability(cap: OrgCapability) {
    setForm((prev) => {
      const has = prev.capabilities.includes(cap);
      return {
        ...prev,
        capabilities: has
          ? prev.capabilities.filter((c) => c !== cap)
          : [...prev.capabilities, cap],
      };
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/org/custom-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to create custom role.");
      }
      setForm({ key: "", name: "", description: "", capabilities: [] });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create custom role.");
    } finally {
      setSaving(false);
    }
  }

  const capabilityKeys = Object.keys(ORG_CAPABILITY_DESCRIPTIONS) as OrgCapability[];

  return (
    <section className="mt-6 rounded-2xl border border-slate-800 bg-[#020617] p-6 text-[13px]">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-[14px] font-semibold text-slate-100">
          Custom roles
        </h2>
        <p className="text-[11px] text-slate-500">
          Create organization-specific roles by bundling capabilities. These roles extend the base OWNER / ADMIN / MEMBER model.
        </p>
      </div>

      {error && (
        <div className="mb-3 rounded border border-red-500/40 bg-red-950/40 px-3 py-2 text-[11px] text-red-200">
          {error}
        </div>
      )}

      <div className="mb-6">
        {loading ? (
          <div className="text-[11px] text-slate-500">Loading custom roles…</div>
        ) : roles.length === 0 ? (
          <div className="text-[11px] text-slate-500">
            No custom roles yet. Use the form below to create the first one.
          </div>
        ) : (
          <div className="space-y-3">
            {roles.map((role) => (
              <div
                key={role.id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <div className="text-[13px] font-medium text-slate-100">
                      {role.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Key: {role.key}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {role.capabilities.length} capabilities
                  </div>
                </div>
                {role.description && (
                  <p className="mt-2 text-[11px] text-slate-400">
                    {role.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleCreate} className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-[11px] text-slate-400">
              Key
            </label>
            <input
              className="w-full rounded-lg border border-slate-800 bg-[#020617] px-3 py-2 text-[13px] text-slate-100 outline-none transition-colors hover:border-slate-700 focus:border-[#5CA9FF] focus:ring-1 focus:ring-[#5CA9FF]"
              placeholder="people-ops"
              value={form.key}
              onChange={(e) =>
                setForm((f) => ({ ...f, key: e.target.value }))
              }
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[11px] text-slate-400">
              Name
            </label>
            <input
              className="w-full rounded-lg border border-slate-800 bg-[#020617] px-3 py-2 text-[13px] text-slate-100 outline-none transition-colors hover:border-slate-700 focus:border-[#5CA9FF] focus:ring-1 focus:ring-[#5CA9FF]"
              placeholder="People Ops"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-slate-400">
            Description (optional)
          </label>
          <textarea
            className="w-full rounded-lg border border-slate-800 bg-[#020617] px-3 py-2 text-[13px] text-slate-100 outline-none transition-colors hover:border-slate-700 focus:border-[#5CA9FF] focus:ring-1 focus:ring-[#5CA9FF]"
            rows={2}
            placeholder="Explain when to assign this role."
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </div>

        <div>
          <div className="mb-2 text-[11px] text-slate-400">
            Capabilities
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {capabilityKeys.map((cap) => {
              const checked = form.capabilities.includes(cap);
              return (
                <label
                  key={cap}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-300 transition-colors hover:border-slate-700"
                >
                  <input
                    type="checkbox"
                    className="mt-[2px]"
                    checked={checked}
                    onChange={() => toggleCapability(cap)}
                  />
                  <span>
                    <span className="block font-medium text-slate-100">
                      {cap}
                    </span>
                    <span className="block text-slate-500">
                      {ORG_CAPABILITY_DESCRIPTIONS[cap] ||
                        "No description yet."}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !form.key || !form.name}
          className="rounded-full bg-slate-100 px-4 py-1.5 text-[12px] font-medium text-slate-900 transition-colors hover:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? "Creating…" : "Create custom role"}
        </button>
      </form>
    </section>
  );
}

