"use client";

/**
 * Phase K: Profile Editor Component
 *
 * Dialog for creating and editing role responsibility profiles.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X } from "lucide-react";

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

type ProfileEditorProps = {
  roleType: string | null; // null = create new
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

// ============================================================================
// Tag Selector
// ============================================================================

function TagSelector({
  label,
  description,
  selectedIds,
  availableTags,
  onChange,
  variant,
}: {
  label: string;
  description: string;
  selectedIds: string[];
  availableTags: ResponsibilityTag[];
  onChange: (ids: string[]) => void;
  variant: "primary" | "allowed" | "forbidden";
}) {
  const variantColors = {
    primary: "bg-blue-500/10 text-blue-700 border-blue-500/30",
    allowed: "bg-green-500/10 text-green-700 border-green-500/30",
    forbidden: "bg-red-500/10 text-red-700 border-red-500/30",
  };

  const toggleTag = (tagId: string) => {
    if (selectedIds.includes(tagId)) {
      onChange(selectedIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedIds, tagId]);
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ScrollArea className="h-32 border rounded-md p-2">
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => {
            const isSelected = selectedIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs transition-colors ${
                  isSelected
                    ? variantColors[variant]
                    : "bg-muted/50 text-muted-foreground border-transparent hover:border-muted-foreground/30"
                }`}
              >
                {isSelected && <Check className="h-3 w-3" />}
                {tag.label}
              </button>
            );
          })}
          {availableTags.length === 0 && (
            <span className="text-xs text-muted-foreground">
              No tags available. Create tags first.
            </span>
          )}
        </div>
      </ScrollArea>
      {selectedIds.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {selectedIds.length} selected
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Profile Editor
// ============================================================================

export function ProfileEditor({
  roleType,
  open,
  onClose,
  onSaved,
}: ProfileEditorProps) {
  const isNew = !roleType;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [availableTags, setAvailableTags] = useState<ResponsibilityTag[]>([]);

  const [formData, setFormData] = useState({
    roleType: "",
    primaryTagIds: [] as string[],
    allowedTagIds: [] as string[],
    forbiddenTagIds: [] as string[],
  });

  // Fetch available tags
  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/org/responsibility/tags");
      const data = await res.json();
      if (data.ok) {
        setAvailableTags(data.tags.filter((t: ResponsibilityTag) => !t.isArchived));
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  }, []);

  // Fetch existing profile if editing
  const fetchProfile = useCallback(async () => {
    if (!roleType) return;
    try {
      setLoading(true);
      const res = await fetch(
        `/api/org/responsibility/profiles/${encodeURIComponent(roleType)}`
      );
      const data = await res.json();
      if (data.ok && data.profile) {
        setFormData({
          roleType: data.profile.roleType,
          primaryTagIds: data.profile.primaryTags.map((t: ResponsibilityTag) => t.id),
          allowedTagIds: data.profile.allowedTags.map((t: ResponsibilityTag) => t.id),
          forbiddenTagIds: data.profile.forbiddenTags.map((t: ResponsibilityTag) => t.id),
        });
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  }, [roleType]);

  useEffect(() => {
    if (open) {
      fetchTags();
      if (roleType) {
        fetchProfile();
      } else {
        setFormData({
          roleType: "",
          primaryTagIds: [],
          allowedTagIds: [],
          forbiddenTagIds: [],
        });
      }
    }
  }, [open, roleType, fetchTags, fetchProfile]);

  const handleSave = async () => {
    if (!formData.roleType.trim()) {
      alert("Role type is required");
      return;
    }

    try {
      setSaving(true);
      const method = isNew ? "POST" : "PATCH";
      const url = isNew
        ? "/api/org/responsibility/profiles"
        : `/api/org/responsibility/profiles/${encodeURIComponent(roleType)}`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.ok) {
        onSaved();
      } else {
        alert(data.error || "Failed to save profile");
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!roleType) return;
    if (!confirm(`Delete profile for ${roleType}?`)) return;

    try {
      setDeleting(true);
      const res = await fetch(
        `/api/org/responsibility/profiles/${encodeURIComponent(roleType)}`,
        { method: "DELETE" }
      );
      const data = await res.json();

      if (data.ok) {
        onSaved();
      } else {
        alert(data.error || "Failed to delete profile");
      }
    } catch (error) {
      console.error("Failed to delete profile:", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "Create Role Profile" : `Edit Profile: ${roleType}`}
          </DialogTitle>
          <DialogDescription>
            Define what responsibilities this role has. Primary tags are the
            core focus, allowed tags are acceptable work, and forbidden tags
            should never be assigned.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-6">
            {isNew && (
              <div>
                <Label htmlFor="roleType">Role Type</Label>
                <Input
                  id="roleType"
                  placeholder="Engineer"
                  value={formData.roleType}
                  onChange={(e) =>
                    setFormData({ ...formData, roleType: e.target.value })
                  }
                />
              </div>
            )}

            <TagSelector
              label="Primary Tags"
              description="Core responsibilities — what this role is primarily for"
              selectedIds={formData.primaryTagIds}
              availableTags={availableTags}
              onChange={(ids) => setFormData({ ...formData, primaryTagIds: ids })}
              variant="primary"
            />

            <TagSelector
              label="Allowed Tags"
              description="Acceptable work — this role can do this when needed"
              selectedIds={formData.allowedTagIds}
              availableTags={availableTags}
              onChange={(ids) => setFormData({ ...formData, allowedTagIds: ids })}
              variant="allowed"
            />

            <TagSelector
              label="Forbidden Tags"
              description="Should not be assigned — will flag alignment issues"
              selectedIds={formData.forbiddenTagIds}
              availableTags={availableTags}
              onChange={(ids) => setFormData({ ...formData, forbiddenTagIds: ids })}
              variant="forbidden"
            />

            {/* Preview selected tags */}
            <div className="p-3 bg-muted/50 rounded-md">
              <div className="text-sm font-medium mb-2">Selected Tags Preview</div>
              <div className="flex flex-wrap gap-2">
                {formData.primaryTagIds.map((id) => {
                  const tag = availableTags.find((t) => t.id === id);
                  return tag ? (
                    <Badge key={id} className="bg-blue-500/20 text-blue-700">
                      {tag.label}
                    </Badge>
                  ) : null;
                })}
                {formData.allowedTagIds.map((id) => {
                  const tag = availableTags.find((t) => t.id === id);
                  return tag ? (
                    <Badge key={id} className="bg-green-500/20 text-green-700">
                      {tag.label}
                    </Badge>
                  ) : null;
                })}
                {formData.forbiddenTagIds.map((id) => {
                  const tag = availableTags.find((t) => t.id === id);
                  return tag ? (
                    <Badge key={id} className="bg-red-500/20 text-red-700">
                      <X className="h-3 w-3 mr-1" />
                      {tag.label}
                    </Badge>
                  ) : null;
                })}
                {formData.primaryTagIds.length === 0 &&
                  formData.allowedTagIds.length === 0 &&
                  formData.forbiddenTagIds.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      No tags selected
                    </span>
                  )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div>
            {!isNew && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.roleType.trim()}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
