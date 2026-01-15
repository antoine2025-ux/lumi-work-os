"use client";

import React, { useEffect, useState } from "react";
import { ToastProvider, useToast } from "../../people/_components/toast";
import { SettingsNav } from "../_components/SettingsNav";

type Invite = {
  id: string;
  email: string;
  role: "VIEWER" | "EDITOR" | "ADMIN";
  status: string;
  token: string;
  createdAt: string;
  expiresAt: string;
};

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    ACCEPTED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    DECLINED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    EXPIRED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${colors[status] || colors.PENDING}`}>
      {status}
    </span>
  );
}

function OrgInvitationsPageInner() {
  const { push } = useToast();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Invite["role"]>("VIEWER");
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<"VIEWER" | "EDITOR" | "ADMIN">("VIEWER");

  async function load() {
    const res = await fetch("/api/org/invitations");
    const data = await res.json().catch(() => ({} as any));
    if (data?.ok) setInvites(data.invites);
  }

  useEffect(() => {
    load();
    (async () => {
      const res = await fetch("/api/org/permissions");
      const data = await res.json().catch(() => ({} as any));
      if (data?.ok) setUserRole(data.role);
    })();
  }, []);

  async function createInvite() {
    if (!email.trim()) {
      push({ tone: "error", title: "Error", message: "Email is required" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/org/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (data?.ok) {
        setEmail("");
        await load();
        const orgName = data.orgName ? ` to ${data.orgName}` : "";
        if (data.inviteLink) {
          setCopied(data.inviteLink);
          navigator.clipboard.writeText(data.inviteLink);
          push({ tone: "success", title: "Invite created", message: `Invitation sent${orgName}. Link copied to clipboard.` });
        } else {
          push({ tone: "success", title: "Invite created", message: `Invitation sent${orgName}` });
        }
      } else {
        push({ tone: "error", title: "Error", message: data?.error ?? "Failed to create invite" });
      }
    } catch (e: any) {
      push({ tone: "error", title: "Error", message: e?.message ?? "Failed to create invite" });
    } finally {
      setLoading(false);
    }
  }

  async function resendInvite(id: string) {
    try {
      const res = await fetch("/api/org/invitations/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (data?.ok) {
        await load();
        const orgName = data.orgName ? ` to ${data.orgName}` : "";
        if (data.inviteLink) {
          navigator.clipboard.writeText(data.inviteLink);
          push({ tone: "success", title: "Invite resent", message: `Invitation resent${orgName}. Link copied to clipboard.` });
        } else {
          push({ tone: "success", title: "Invite resent", message: `Invitation resent${orgName}` });
        }
      } else {
        push({ tone: "error", title: "Error", message: data?.error ?? "Failed to resend invite" });
      }
    } catch (e: any) {
      push({ tone: "error", title: "Error", message: e?.message ?? "Failed to resend invite" });
    }
  }

  async function revokeInvite(id: string) {
    if (!confirm("Revoke this invitation?")) return;
    try {
      const res = await fetch("/api/org/invitations/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (data?.ok) {
        await load();
        push({ tone: "success", title: "Invite revoked", message: "Invitation has been revoked" });
      } else {
        push({ tone: "error", title: "Error", message: data?.error ?? "Failed to revoke invite" });
      }
    } catch (e: any) {
      push({ tone: "error", title: "Error", message: e?.message ?? "Failed to revoke invite" });
    }
  }

  const inviteLink = (token: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/org/invite/${token}`;

  return (
    <div className="px-6 py-6">
      <div className="max-w-3xl space-y-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <SettingsNav role={userRole} />
          </div>
          <div className="lg:col-span-3 space-y-6">
            <div>
              <h1 className="text-xl font-semibold">Invitations</h1>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                Invite members with controlled roles. Invitations are sent via email.
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5 space-y-3">
          <div className="text-sm font-semibold">Create invite</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@company.com"
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full sm:w-[160px] rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black"
            >
              <option value="VIEWER">Viewer</option>
              <option value="EDITOR">Editor</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button
              type="button"
              onClick={createInvite}
              disabled={loading}
              className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {loading ? "Creating…" : "Create"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-semibold">Pending / recent</div>
          <div className="mt-3 space-y-2">
            {invites.length === 0 ? (
              <div className="text-sm text-black/60 dark:text-white/60">No invitations yet.</div>
            ) : (
              invites.map((i) => (
                <div key={i.id} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{i.email}</div>
                    <StatusPill status={i.status} />
                  </div>
                  <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                    Role: {i.role}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {i.status === "PENDING" && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const link = inviteLink(i.token);
                            navigator.clipboard.writeText(link);
                            push({ tone: "success", title: "Copied", message: "Invite link copied to clipboard" });
                          }}
                          className="rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
                        >
                          Copy link
                        </button>
                        <button
                          type="button"
                          onClick={() => resendInvite(i.id)}
                          className="rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
                        >
                          Resend
                        </button>
                        <button
                          type="button"
                          onClick={() => revokeInvite(i.id)}
                          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300"
                        >
                          Revoke
                        </button>
                      </>
                    )}
                    {(i.status === "EXPIRED" || i.status === "DECLINED") && (
                      <button
                        type="button"
                        onClick={() => resendInvite(i.id)}
                        className="rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
                      >
                        Resend
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrgInvitationsPage() {
  return (
    <ToastProvider>
      <OrgInvitationsPageInner />
    </ToastProvider>
  );
}
