"use client";

/**
 * Phase K: Tags Management Client
 *
 * UI for managing responsibility tags and role profiles.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Archive, Tag, UserCog } from "lucide-react";
import { ProfileEditor } from "./ProfileEditor";

// ============================================================================
// Types
// ============================================================================

type ResponsibilityTag = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  category: string | null;
  isArchived: boolean;
};

// ============================================================================
// Tags Tab
// ============================================================================

function TagsTab() {
  const [tags, setTags] = useState<ResponsibilityTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTag, setNewTag] = useState({
    key: "",
    label: "",
    description: "",
    category: "",
  });

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/org/responsibility/tags?includeArchived=${showArchived}`
      );
      const data = await res.json();
      if (data.ok) {
        setTags(data.tags);
      }
    } catch (error: unknown) {
      console.error("Failed to fetch tags:", error);
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleCreate = async () => {
    if (!newTag.key || !newTag.label) return;
    try {
      setCreating(true);
      const res = await fetch("/api/org/responsibility/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTag),
      });
      const data = await res.json();
      if (data.ok) {
        setIsCreateOpen(false);
        setNewTag({ key: "", label: "", description: "", category: "" });
        fetchTags();
      } else {
        alert(data.error || "Failed to create tag");
      }
    } catch (error: unknown) {
      console.error("Failed to create tag:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleArchive = async (key: string) => {
    if (!confirm("Archive this tag? It will no longer be selectable.")) return;
    try {
      await fetch(`/api/org/responsibility/tags/${key}`, {
        method: "DELETE",
      });
      fetchTags();
    } catch (error: unknown) {
      console.error("Failed to archive tag:", error);
    }
  };

  // Group tags by category
  const groupedTags = tags.reduce(
    (acc, tag) => {
      const category = tag.category || "Uncategorized";
      if (!acc[category]) acc[category] = [];
      acc[category].push(tag);
      return acc;
    },
    {} as Record<string, ResponsibilityTag[]>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? "Hide Archived" : "Show Archived"}
          </Button>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Tag
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTags).map(([category, categoryTags]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {categoryTags.map((tag) => (
                    <div
                      key={tag.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                        tag.isArchived ? "opacity-50 bg-muted" : "bg-background"
                      }`}
                    >
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">{tag.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {tag.key}
                        </div>
                      </div>
                      {tag.isArchived ? (
                        <Badge variant="secondary" className="text-xs">
                          Archived
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleArchive(tag.key)}
                        >
                          <Archive className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {Object.keys(groupedTags).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No tags created yet. Create your first responsibility tag.
            </div>
          )}
        </div>
      )}

      {/* Create Tag Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Responsibility Tag</DialogTitle>
            <DialogDescription>
              Tags describe types of work. They&apos;re used for role alignment
              checking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                placeholder="ENGINEERING_BACKEND"
                value={newTag.key}
                onChange={(e) =>
                  setNewTag({ ...newTag, key: e.target.value.toUpperCase() })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Uppercase with underscores (e.g., ENGINEERING_BACKEND)
              </p>
            </div>
            <div>
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                placeholder="Backend Engineering"
                value={newTag.label}
                onChange={(e) => setNewTag({ ...newTag, label: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="Backend development and infrastructure"
                value={newTag.description}
                onChange={(e) =>
                  setNewTag({ ...newTag, description: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="category">Category (optional)</Label>
              <Input
                id="category"
                placeholder="Engineering"
                value={newTag.category}
                onChange={(e) =>
                  setNewTag({ ...newTag, category: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !newTag.key || !newTag.label}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Profiles Tab
// ============================================================================

function ProfilesTab({ initialRoleType }: { initialRoleType?: string | null }) {
  const [profiles, setProfiles] = useState<{
    id: string;
    roleType: string;
    primaryTags: ResponsibilityTag[];
    allowedTags: ResponsibilityTag[];
    forbiddenTags: ResponsibilityTag[];
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const deepLinkHandled = useRef(false);

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/org/responsibility/profiles");
      const data = await res.json();
      if (data.ok) {
        setProfiles(data.profiles);
      }
    } catch (error: unknown) {
      console.error("Failed to fetch profiles:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Deep-link: auto-open profile from initialRoleType prop
  useEffect(() => {
    if (deepLinkHandled.current || loading || !initialRoleType) return;
    const match = profiles.find((p) => p.roleType === initialRoleType);
    if (match) {
      setSelectedProfile(match.roleType);
      deepLinkHandled.current = true;
    } else if (!loading && profiles.length > 0) {
      // Role type not found — open "new" profile editor pre-filled with this roleType
      setSelectedProfile("new");
      deepLinkHandled.current = true;
    }
  }, [loading, profiles, initialRoleType]);

  const handleProfileSaved = () => {
    setSelectedProfile(null);
    fetchProfiles();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setSelectedProfile("new")}>
          <Plus className="h-4 w-4 mr-2" />
          Create Profile
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-4">
          {profiles.map((profile) => (
            <Card
              key={profile.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedProfile(profile.roleType)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserCog className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{profile.roleType}</div>
                      <div className="text-sm text-muted-foreground">
                        {profile.primaryTags.length} primary,{" "}
                        {profile.allowedTags.length} allowed,{" "}
                        {profile.forbiddenTags.length} forbidden
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {profile.primaryTags.slice(0, 3).map((tag) => (
                      <Badge key={tag.id} variant="default" className="text-xs">
                        {tag.label}
                      </Badge>
                    ))}
                    {profile.primaryTags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{profile.primaryTags.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {profiles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No profiles created yet. Create your first role profile.
            </div>
          )}
        </div>
      )}

      {/* Profile Editor Dialog */}
      {selectedProfile && (
        <ProfileEditor
          roleType={selectedProfile === "new" ? null : selectedProfile}
          open={!!selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onSaved={handleProfileSaved}
        />
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TagsManagementClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roleTypeParam = searchParams.get("roleType");

  // If deep-link has ?roleType=, default to profiles tab and clear param
  const defaultTab = roleTypeParam ? "profiles" : "tags";

  useEffect(() => {
    if (!roleTypeParam) return;
    // Clear the param after reading to avoid re-triggering
    const url = new URL(window.location.href);
    url.searchParams.delete("roleType");
    router.replace(url.pathname + url.search, { scroll: false });
  }, [roleTypeParam, router]);

  return (
    <Tabs defaultValue={defaultTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="tags" className="flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Tags
        </TabsTrigger>
        <TabsTrigger value="profiles" className="flex items-center gap-2">
          <UserCog className="h-4 w-4" />
          Role Profiles
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tags">
        <TagsTab />
      </TabsContent>

      <TabsContent value="profiles">
        <ProfilesTab initialRoleType={roleTypeParam} />
      </TabsContent>
    </Tabs>
  );
}
