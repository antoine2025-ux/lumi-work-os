"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";

type Invite = {
  token: string;
  status: string;
  role: "VIEWER" | "EDITOR" | "ADMIN";
  email: string;
  expiresAt: string;
  org: { id: string; name: string };
};

function pill(status: string) {
  const base = "rounded-full border px-2 py-0.5 text-xs";
  if (status === "PENDING") return `${base} border-amber-300/60 bg-amber-50/60 dark:border-amber-400/30 dark:bg-amber-400/10`;
  if (status === "ACCEPTED") return `${base} border-emerald-300/60 bg-emerald-50/60 dark:border-emerald-400/30 dark:bg-emerald-400/10`;
  return `${base} border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/10`;
}

export default function InviteAcceptPage() {
  const params = useParams();
  const token = params?.token as string;
  const { update } = useSession();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [state, setState] = useState<{ loading: boolean; message?: string }>({ loading: true });

  useEffect(() => {
    if (!token) return;
    (async () => {
      const res = await fetch(`/api/org/invitations/resolve?token=${encodeURIComponent(token)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({} as any));
      if (!data?.ok) {
        setState({ loading: false, message: data?.error ?? "Invite not found" });
        return;
      }
      setInvite(data.invite);
      setState({ loading: false });
    })();
  }, [token]);

  async function respond(decision: "ACCEPT" | "DECLINE") {
    if (!token) return;
    setState({ loading: true });
    const res = await fetch("/api/org/invitations/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, decision }),
    });
    const data = await res.json().catch(() => ({} as any));

    if (!data?.ok) {
      setState({ loading: false, message: data?.error ?? "Failed" });
      return;
    }

    if (data.status === "ACCEPTED") {
      // Persist active org in session (NextAuth JWT/session)
      await update({ activeOrgId: data.orgId } as any);

      setState({ loading: false, message: `Accepted — redirecting to ${data.orgName}…` });

      window.setTimeout(() => {
        window.location.href = "/org";
      }, 500);
    } else {
      setState({ loading: false, message: "Declined." });
    }
  }

  const expired = invite ? new Date(invite.expiresAt).getTime() < Date.now() : false;

  return (
    <div className="mx-auto max-w-xl space-y-6 px-6 py-12">
      <div>
        <h1 className="text-xl font-semibold">Organization invitation</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Review details and choose your response.
        </p>
      </div>

      {state.loading ? (
        <div className="rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-black/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
          Loading…
        </div>
      ) : state.message && !invite ? (
        <div className="rounded-2xl border border-rose-300/60 bg-rose-50/60 p-4 text-sm text-black/70 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-white/70">
          {state.message}
        </div>
      ) : (
        <div className="rounded-2xl border border-black/10 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">{invite?.org.name}</div>
              <div className="mt-1 text-sm text-black/60 dark:text-white/60">
                Invited as <span className="font-medium">{invite?.role}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className={pill(invite?.status || "UNKNOWN")}>{invite?.status}</span>
                {expired ? (
                  <span className="rounded-full border border-rose-300/60 bg-rose-50/60 px-2 py-0.5 text-xs dark:border-rose-400/30 dark:bg-rose-400/10">
                    Expired
                  </span>
                ) : null}
              </div>
            </div>
            <div className="text-xs text-black/50 dark:text-white/50">
              {invite ? `For: ${invite.email}` : null}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-black/10 bg-black/5 p-3 text-xs text-black/60 dark:border-white/10 dark:bg-white/10 dark:text-white/60">
            Expires: {invite ? new Date(invite.expiresAt).toLocaleString() : "-"}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => respond("ACCEPT")}
              disabled={!invite || invite.status !== "PENDING" || expired || state.loading}
              className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white disabled:bg-black/10 disabled:text-black/40 dark:bg-white dark:text-black dark:disabled:bg-white/10 dark:disabled:text-white/40"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => respond("DECLINE")}
              disabled={!invite || invite.status !== "PENDING" || expired || state.loading}
              className="rounded-xl border border-black/10 px-3 py-2 text-sm font-medium text-black/70 disabled:text-black/40 dark:border-white/10 dark:text-white/70 dark:disabled:text-white/40"
            >
              Decline
            </button>
          </div>

          {state.message ? (
            <div className="mt-3 text-sm text-black/70 dark:text-white/70">
              {state.message}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
