"use client";

/**
 * Decision Domain List Client
 * 
 * Displays list of decision domains with authority status.
 * Phase I: UI renders API output only; no resolution logic in client.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Users, AlertCircle, CheckCircle2, Settings } from "lucide-react";
import { SetAuthorityDrawer } from "./SetAuthorityDrawer";

type DecisionDomainSummary = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  scope: string;
  isArchived: boolean;
  hasAuthority: boolean;
  primaryType: string | null;
  escalationCount: number;
  createdAt: string;
};

export function DecisionDomainListClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [domains, setDomains] = useState<DecisionDomainSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<DecisionDomainSummary | null>(null);
  const deepLinkHandled = useRef(false);

  // Create form state
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [newScope, setNewScope] = useState("WORKSPACE");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchDomains = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/org/decision/domains");
      if (!response.ok) throw new Error("Failed to fetch domains");

      const data = await response.json();
      setDomains(data.domains ?? []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  // Deep-link: auto-open domain from ?domain= query param
  useEffect(() => {
    if (deepLinkHandled.current || loading || domains.length === 0) return;
    const domainKey = searchParams.get("domain");
    if (!domainKey) return;

    const match = domains.find((d) => d.key === domainKey);
    if (match) {
      setSelectedDomain(match);
      deepLinkHandled.current = true;
      // Clear the param to avoid re-triggering
      const url = new URL(window.location.href);
      url.searchParams.delete("domain");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [loading, domains, searchParams, router]);

  const handleCreate = async () => {
    try {
      setCreateLoading(true);
      setCreateError(null);

      const response = await fetch("/api/org/decision/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newKey,
          name: newName,
          scope: newScope,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to create domain");
      }

      setIsCreateOpen(false);
      setNewKey("");
      setNewName("");
      setNewScope("WORKSPACE");
      fetchDomains();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAuthoritySet = () => {
    setSelectedDomain(null);
    fetchDomains();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading decision domains...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {domains.length} domain{domains.length !== 1 ? "s" : ""}
        </span>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Domain
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Decision Domain</DialogTitle>
              <DialogDescription>
                Define a new decision domain. You&apos;ll configure authority after creation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="key">Key (uppercase identifier)</Label>
                <Input
                  id="key"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                  placeholder="e.g., SECURITY, HIRING"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Security Decisions"
                />
              </div>
              <div className="space-y-2">
                <Label>Scope</Label>
                <Select value={newScope} onValueChange={setNewScope}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WORKSPACE">Workspace</SelectItem>
                    <SelectItem value="DEPARTMENT">Department</SelectItem>
                    <SelectItem value="TEAM">Team</SelectItem>
                    <SelectItem value="FUNCTION">Function</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {createError && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{createError}</span>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createLoading || !newKey || !newName}>
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!error && domains.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No decision domains</p>
              <p className="text-sm mt-1">
                Create domains like SECURITY, HIRING, ROADMAP to configure decision authority.
              </p>
              <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Domain
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Domain list */}
      {domains.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {domains.map((domain) => (
            <Card key={domain.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{domain.name}</CardTitle>
                    <p className="text-sm text-muted-foreground font-mono">{domain.key}</p>
                  </div>
                  <Badge variant={domain.hasAuthority ? "default" : "secondary"}>
                    {domain.hasAuthority ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Configured
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Missing
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {domain.hasAuthority ? (
                      <>
                        {domain.primaryType === "PERSON" ? "Person" : "Role"} primary
                        {domain.escalationCount > 0 && (
                          <span> + {domain.escalationCount} escalation</span>
                        )}
                      </>
                    ) : (
                      "No authority set"
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDomain(domain)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Configure
                  </Button>
                </div>
                {domain.description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {domain.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Set Authority Drawer */}
      <SetAuthorityDrawer
        domain={selectedDomain}
        open={!!selectedDomain}
        onOpenChange={(open) => !open && setSelectedDomain(null)}
        onSuccess={handleAuthoritySet}
      />
    </div>
  );
}
