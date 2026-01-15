"use client";

import { useState } from "react";

type OrgRelation = {
  type: string;
  sourceId: string;
  targetId: string;
  label?: string;
};

type OrgRelationsDebugResponse =
  | {
      ok: true;
      item: {
        id: string;
        contextId: string;
        workspaceId: string;
        type: string;
        title: string;
        summary: string | null;
        data: any;
        updatedAt: string;
      };
      contextObject: any;
      relations: OrgRelation[];
    }
  | {
      ok: false;
      error: string;
    };

export function OrgRelationsDebugPanel() {
  const [contextIdInput, setContextIdInput] = useState("");
  const [data, setData] = useState<OrgRelationsDebugResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLoad() {
    const trimmed = contextIdInput.trim();
    if (!trimmed) {
      setError("Please enter a contextId, e.g. person:<id> or team:<id>.");
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(
        `/api/dev/org-loopbrain/relations-debug?contextId=${encodeURIComponent(
          trimmed
        )}`
      );
      const json: OrgRelationsDebugResponse = await res.json();

      if (!res.ok || !("ok" in json) || !json.ok) {
        setError(
          (json as any).error ??
            "Failed to load Org relations debug for this contextId."
        );
        setData(json);
        return;
      }

      setData(json);
    } catch (e) {
      console.error("[OrgRelationsDebugPanel] fetch error", e);
      setError("Failed to load Org relations debug. See console for details.");
    } finally {
      setLoading(false);
    }
  }

  const okData = data && "ok" in data && data.ok ? data : null;
  const relations = okData?.relations ?? [];
  const contextObject = okData?.contextObject ?? null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-muted/40 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-medium">
            Org relations debug (ContextItems)
          </div>
          <div className="text-[11px] text-muted-foreground">
            Inspect relations for a specific ContextItem as Loopbrain sees it.
          </div>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          Dev-only
        </span>
      </div>

      <div className="mt-1 flex gap-2">
        <input
          type="text"
          value={contextIdInput}
          onChange={(e) => setContextIdInput(e.target.value)}
          placeholder="person:<id> or team:<id> or department:<id>"
          className="w-full rounded-md border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) {
              handleLoad();
            }
          }}
        />
        <button
          type="button"
          onClick={handleLoad}
          disabled={loading}
          className="rounded-md border bg-background px-2 py-1 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Loading..." : "Load"}
        </button>
      </div>

      <div className="text-[10px] text-muted-foreground">
        Tip: ContextIds usually look like <code className="rounded bg-muted px-1">person:&lt;userId&gt;</code>,{" "}
        <code className="rounded bg-muted px-1">team:&lt;orgTeamId&gt;</code>,{" "}
        <code className="rounded bg-muted px-1">department:&lt;orgDepartmentId&gt;</code>.
      </div>

      {error && (
        <div className="mt-2 rounded-xl bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
          {error}
        </div>
      )}

      {okData && (
        <div className="mt-2 flex flex-col gap-2 rounded-xl bg-background/80 p-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-medium">
                {okData.item.contextId}{" "}
                <span className="text-muted-foreground">
                  ({okData.item.type})
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {okData.item.title || "(no title)"} • Updated:{" "}
                {new Date(okData.item.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="mt-1 rounded-lg border bg-muted/40 p-2">
            <div className="mb-1 text-[11px] font-medium">Relations</div>
            {relations.length === 0 ? (
              <div className="text-[10px] text-muted-foreground">
                No relations found on this ContextObject.
              </div>
            ) : (
              <div className="max-h-48 overflow-auto rounded-md border bg-background">
                <table className="min-w-full border-collapse text-[10px]">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="border-b px-2 py-1 text-left font-medium">
                        type
                      </th>
                      <th className="border-b px-2 py-1 text-left font-medium">
                        sourceId
                      </th>
                      <th className="border-b px-2 py-1 text-left font-medium">
                        targetId
                      </th>
                      <th className="border-b px-2 py-1 text-left font-medium">
                        label
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {relations.map((rel, idx) => (
                      <tr key={idx} className="odd:bg-muted/20">
                        <td className="border-b px-2 py-1 font-mono text-[10px]">
                          {rel.type}
                        </td>
                        <td className="border-b px-2 py-1 font-mono text-[10px]">
                          {rel.sourceId}
                        </td>
                        <td className="border-b px-2 py-1 font-mono text-[10px]">
                          {rel.targetId}
                        </td>
                        <td className="border-b px-2 py-1 text-[10px]">
                          {rel.label ?? (
                            <span className="text-muted-foreground">–</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-1 rounded-lg bg-muted/30 p-2 text-[10px] text-muted-foreground">
            Use this to compare Loopbrain&apos;s org graph with the Org UI: for a
            given person, team, or department, their relations here should reflect
            the same manager, reports, team, and department you see in Org.
          </div>

          {contextObject && (
            <details className="mt-1 rounded-lg border bg-muted/20 p-2 text-[10px]">
              <summary className="cursor-pointer font-medium">
                Raw ContextObject (JSON)
              </summary>
              <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap text-[10px]">
                {JSON.stringify(contextObject, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

