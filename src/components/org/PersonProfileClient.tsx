/**
 * Person Profile Client Component
 * 
 * Premium, identity-first profile view with two-column layout:
 * - Main page is completely read-only, focused on displaying identity
 * - "Edit profile" button opens a side panel for all edits
 * - Panel contains: Role/Title, Team, Manager, Availability
 * 
 * Note: Structural assignments are edited via the side panel,
 * keeping the main view clean and identity-focused.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { OrgApi, type OrgPersonDTO } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Check, Loader2, X, Pencil, ChevronDown, Check as CheckIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getPersonDisplayBadges } from "@/lib/org/personDisplay";
import { useCurrentOrgRole } from "@/hooks/useCurrentOrgRole";
import { PersonAvailabilityCard } from "./people/PersonAvailabilityCard";
import { PersonSkillsCard } from "./people/PersonSkillsCard";
import { isMutationSuccess, publishMutationResult } from "@/lib/org/mutations";

type PersonProfileClientProps = {
  personId: string;
  onEditButtonRender?: (button: React.ReactNode) => void;
  initialFocusField?: "manager" | "team" | "title" | "availability"; // Field to focus when edit panel opens
};

export function PersonProfileClient({ personId, onEditButtonRender, initialFocusField }: PersonProfileClientProps) {
  const { toast } = useToast();
  const [personKey, setPersonKey] = useState(0);
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  
  // Open edit panel if initialFocusField is set
  useEffect(() => {
    if (initialFocusField) {
      setEditPanelOpen(true);
    }
  }, [initialFocusField]);
  const flagsQ = useOrgQuery(() => OrgApi.getFlags(), []);
  const personQ = useOrgQuery(() => OrgApi.getPerson(personId), [personId, personKey]);
  const structureQ = useOrgQuery(() => OrgApi.getStructure(), []);
  const peopleQ = useOrgQuery(() => OrgApi.listPeople(), []);
  const { role } = useCurrentOrgRole();


  const canWrite = flagsQ.data?.flags?.peopleWrite === true;
  // Allow workspace owners/admins to edit managers (same permission as delete)
  const canReporting = flagsQ.data?.flags?.reportingWrite === true || role === "OWNER" || role === "ADMIN";
  const canAvailability = flagsQ.data?.flags?.availabilityWrite === true;

  const refetchPerson = useCallback(() => {
    setPersonKey((prev) => prev + 1);
  }, []);

  // Render edit button to header via callback - MUST be before any early returns
  const handleEditClick = useCallback(() => {
    setEditPanelOpen(true);
  }, []);

  useEffect(() => {
    if (onEditButtonRender && (canWrite || canReporting || canAvailability)) {
      onEditButtonRender(
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEditClick}
          className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          aria-label="Edit profile"
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit profile
        </Button>
      );
    } else if (onEditButtonRender) {
      onEditButtonRender(null);
    }
  }, [onEditButtonRender, canWrite, canReporting, canAvailability, handleEditClick]);

  const person = personQ.data;

  if (personQ.loading) {
    return <div className="text-sm text-slate-400">Loading profile…</div>;
  }
  if (personQ.error) {
    return <div className="text-sm text-red-400">Failed to load profile</div>;
  }
  if (!person) {
    return <div className="text-sm text-slate-400">Not found</div>;
  }

  // Get initials for avatar
  function getInitials(name: string | null | undefined): string {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Generate consistent premium gradient from name
  function getAvatarGradient(name: string | null | undefined): string {
    if (!name) return "from-slate-500 to-slate-700";
    
    // Hash function for consistency
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    // Curated premium gradient combinations
    const gradients = [
      "from-blue-500 to-blue-700",
      "from-purple-500 to-purple-700",
      "from-pink-500 to-rose-600",
      "from-cyan-500 to-blue-600",
      "from-emerald-500 to-teal-600",
      "from-amber-500 to-orange-600",
      "from-indigo-500 to-purple-600",
      "from-violet-500 to-purple-700",
      "from-sky-500 to-blue-600",
      "from-green-500 to-emerald-600",
      "from-rose-500 to-pink-600",
      "from-orange-500 to-amber-600",
      "from-teal-500 to-cyan-600",
      "from-slate-500 to-slate-700",
      "from-red-500 to-rose-600",
      "from-lime-500 to-green-600",
    ];
    
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  }

  const initials = getInitials(person.fullName);
  const avatarGradient = getAvatarGradient(person.fullName);

  // Get display badges (team label and issue label) - same logic as People list
  const badges = getPersonDisplayBadges({
    team: person.team,
    department: person.department,
    title: person.title,
    role: person.role,
    manager: (person as any).manager,
    managerId: (person as any).managerId,
  });

  return (
    <div className="max-w-4xl">

      {/* Identity Header Section - Vertically Structured, Identity-First */}
      <div className="mb-10 pb-10 border-b border-white/10">
        <div className="flex flex-col">
          {/* Large Square Avatar - Premium, Intentionally Designed */}
          {/* POLISH: Added premium depth with gradient, enhanced border, subtle shadows, and glass highlight */}
          <div className="mb-6 relative">
            <div className={cn(
              "h-[200px] w-[200px] flex items-center justify-center relative",
              "border border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]",
              "rounded-2xl overflow-hidden",
              "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/5 before:to-transparent before:pointer-events-none" // Glass highlight
            )}>
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br",
                avatarGradient,
                "shadow-[inset_0_4px_12px_rgba(0,0,0,0.4)]" // Deeper inner shadow
              )} />
              <div className="relative z-10 text-white text-6xl font-bold tracking-wide">
                {initials}
              </div>
            </div>
          </div>

          {/* Name - Stacked under avatar */}
          <div className="mb-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-50 tracking-tight">
                {person.fullName || "Unknown"}
              </h1>
              
              {/* Availability Status - Subtle, informative, clickable */}
              {person.availabilityStatus && person.availabilityStatus !== "UNKNOWN" && (
                <button
                  type="button"
                  onClick={() => canAvailability && setEditPanelOpen(true)}
                  disabled={!canAvailability}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                    person.availabilityStatus === "AVAILABLE" && "bg-green-500/10 text-green-400 border border-green-500/20",
                    person.availabilityStatus === "PARTIALLY_AVAILABLE" && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                    person.availabilityStatus === "UNAVAILABLE" && "bg-red-500/10 text-red-400 border border-red-500/20",
                    canAvailability && "hover:opacity-80 cursor-pointer",
                    !canAvailability && "cursor-default"
                  )}
                  title={canAvailability ? "Click to edit availability" : undefined}
                >
                  {person.availabilityStatus === "AVAILABLE" && "Available"}
                  {person.availabilityStatus === "PARTIALLY_AVAILABLE" && "Partial"}
                  {person.availabilityStatus === "UNAVAILABLE" && "Unavailable"}
                </button>
              )}
            </div>
          </div>

          {/* Role/Title as secondary text */}
          {person.title && (
            <div className="text-base text-slate-300 font-medium mb-3">
              {person.title}
            </div>
          )}

          {/* Team and issue badges */}
          {/* Use the same helper as People list for consistency */}
          {(badges.teamLabel || badges.issueLabel) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {badges.teamLabel && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800/50 text-slate-400 border border-white/5">
                  {badges.teamLabel}
                </span>
              )}
              {badges.issueLabel && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-slate-800/35 text-slate-500 border border-white/5">
                  {badges.issueLabel}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Information Card - Premium Settings Panel Feel */}
      {/* POLISH: Increased spacing, smaller/muted labels, larger/brighter values, subtle dividers for better scanning */}
      <Card className="border-white/5 bg-slate-900/40">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Role / Title */}
            <div className="pb-6 border-b border-white/5">
              <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2.5">Role / Title</div>
              <div className="text-base text-slate-200">
                {person.title ?? (
                  <span className="text-slate-500/60 italic">Not set</span>
                )}
              </div>
            </div>

            {/* Team */}
            <div className="pb-6 border-b border-white/5">
              <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2.5">Team</div>
              <div className="text-base text-slate-200">
                {person.team?.name ?? (
                  <span className="text-slate-500/60 italic">Not assigned</span>
                )}
              </div>
            </div>

            {/* Department */}
            <div className="pb-6 border-b border-white/5">
              <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2.5">Department</div>
              <div className="text-base text-slate-200">
                {person.department?.name ?? (
                  <span className="text-slate-500/60 italic">Not assigned</span>
                )}
              </div>
            </div>

            {/* Manager */}
            <div>
              <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2.5">Manager</div>
              {person.manager ? (
                <Link
                  href={`/org/people/${person.manager.id}`}
                  className="text-base text-blue-400 hover:text-blue-300 hover:underline inline-block"
                >
                  {person.manager.fullName}
                </Link>
              ) : (
                <div className="text-base text-slate-500/60 italic">Not assigned</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Panel */}
      {editPanelOpen && (
        <EditProfilePanel
          person={person}
          personId={personId}
          personQ={personQ}
          structureQ={structureQ}
          peopleQ={peopleQ}
          canWrite={canWrite}
          canReporting={canReporting}
          canAvailability={canAvailability}
          initialFocusField={initialFocusField}
          onClose={() => setEditPanelOpen(false)}
          onSave={() => {
            refetchPerson();
            setEditPanelOpen(false);
          }}
          onPersonChanged={refetchPerson}
        />
      )}

    </div>
  );
}

// Edit Profile Panel Component
function EditProfilePanel({
  person,
  personId,
  personQ,
  structureQ,
  peopleQ,
  canWrite,
  canReporting,
  canAvailability,
  initialFocusField,
  onClose,
  onSave,
  onPersonChanged,
}: {
  person: NonNullable<ReturnType<typeof useOrgQuery<typeof OrgApi.getPerson>>['data']>;
  personId: string;
  personQ: ReturnType<typeof useOrgQuery<typeof OrgApi.getPerson>>;
  structureQ: ReturnType<typeof useOrgQuery<typeof OrgApi.getStructure>>;
  peopleQ: ReturnType<typeof useOrgQuery<typeof OrgApi.listPeople>>;
  canWrite: boolean;
  canReporting: boolean;
  canAvailability: boolean;
  initialFocusField?: "manager" | "team" | "title" | "availability";
  onClose: () => void;
  onSave: () => void;
  onPersonChanged?: () => void; // Callback to refetch person data without closing panel
}) {
  const { toast } = useToast();
  const [nameValue, setNameValue] = useState(person.fullName ?? "");
  const [titleValue, setTitleValue] = useState(person.title ?? "");
  const [selectedTeamId, setSelectedTeamId] = useState<string | "__none__">(person.team?.id ?? "__none__");
  const [selectedManagerId, setSelectedManagerId] = useState<string | "__none__">(person.manager?.id ?? "__none__");
  const [managerPopoverOpen, setManagerPopoverOpen] = useState(false);
  const [managerSearchQuery, setManagerSearchQuery] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const titleSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const nameSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const managerSelectRef = useRef<HTMLButtonElement>(null);

  // Deduplicate teams by name (in case of database duplicates with same name)
  // Keep only the first occurrence of each team name (case-insensitive)
  const allTeamsRaw = structureQ.data?.teams ?? [];
  const teamsMapByName = new Map<string, typeof allTeamsRaw[0]>();
  
  for (const team of allTeamsRaw) {
    // Normalize team name for case-insensitive comparison
    const normalizedName = team.name?.trim().toLowerCase() || '';
    if (normalizedName && !teamsMapByName.has(normalizedName)) {
      // Keep first occurrence of each team name
      teamsMapByName.set(normalizedName, team);
    }
  }
  
  // Convert map values to array, preserving original team names
  const teams = Array.from(teamsMapByName.values());
  
  const people = peopleQ.data?.people ?? [];
  
  // Filter out the person themselves from manager options
  // person.id is OrgPosition ID (from getPerson), p.id in people list is also OrgPosition ID (from listPeople)
  // personId prop is User ID (from URL), but we should compare by OrgPosition ID since that's what both have
  const managerOptions = people.filter((p) => {
    // Compare by OrgPosition ID - person.id is the current person's position ID
    return p.id !== person.id;
  });
  
  // Filter manager options by search query
  const filteredManagerOptions = managerSearchQuery
    ? managerOptions.filter((p) =>
        p.fullName.toLowerCase().includes(managerSearchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(managerSearchQuery.toLowerCase())
      )
    : managerOptions;

  // Save name function
  const saveName = useCallback(async (value: string) => {
    if (!canWrite) return;
    const trimmedValue = value.trim();
    if (trimmedValue === (person?.fullName ?? "")) return;
    
    if (!trimmedValue) {
      toast({ title: "Name is required", description: "Please enter a name.", variant: "destructive" });
      return;
    }
    
    setSavingName(true);
    try {
      await OrgApi.setName(personId, { name: trimmedValue });
      toast({ title: "Name updated", description: "The name has been saved successfully." });
      onSave(); // Refresh person data to update avatar initials
    } catch (error: any) {
      console.error("Failed to set name:", error);
      toast({ title: "Failed to update name", description: error?.message || "Please try again.", variant: "destructive" });
      // Revert to previous value on error
      setNameValue(person.fullName ?? "");
    } finally {
      setSavingName(false);
    }
  }, [person, personId, canWrite, toast, onSave]);

  // Auto-save name
  const handleNameChange = useCallback((value: string) => {
    setNameValue(value);
    if (nameSaveTimerRef.current) {
      clearTimeout(nameSaveTimerRef.current);
    }
    nameSaveTimerRef.current = setTimeout(() => {
      saveName(value);
    }, 1000);
  }, [saveName]);

  const handleNameBlur = useCallback(() => {
    if (nameSaveTimerRef.current) {
      clearTimeout(nameSaveTimerRef.current);
    }
    saveName(nameValue);
  }, [nameValue, saveName]);

  // Save title function
  const saveTitle = useCallback(async (value: string) => {
    if (!canWrite) return;
    const trimmedValue = value.trim();
    if (trimmedValue === (person?.title ?? "")) return;
    
    try {
      // Send empty string instead of null to avoid null constraint violations
      // The API will handle converting empty string to null if needed
      await OrgApi.setTitle(personId, { title: trimmedValue || "" });
      toast({ title: "Title updated", description: "The title has been saved successfully." });
    } catch (error: any) {
      console.error("Failed to set title:", error);
      toast({ title: "Failed to update title", description: error?.message || "Please try again.", variant: "destructive" });
    }
  }, [person, personId, canWrite, toast]);

  // Auto-save title
  const handleTitleChange = useCallback((value: string) => {
    setTitleValue(value);
    if (titleSaveTimerRef.current) {
      clearTimeout(titleSaveTimerRef.current);
    }
    titleSaveTimerRef.current = setTimeout(() => {
      saveTitle(value);
    }, 1000);
  }, [saveTitle]);

  const handleTitleBlur = useCallback(() => {
    if (titleSaveTimerRef.current) {
      clearTimeout(titleSaveTimerRef.current);
    }
    saveTitle(titleValue);
  }, [titleValue, saveTitle]);

  // Handle team change
  const handleTeamChange = useCallback(async (teamId: string) => {
    if (!canWrite) return;
    setSelectedTeamId(teamId);
    setSaving(true);
    
    try {
      const result = await OrgApi.setTeam(personId, {
        teamId: teamId === "__none__" ? null : teamId,
      });
      
      // Check if mutation succeeded
      if (!isMutationSuccess(result)) {
        throw new Error(result.error || "Failed to update team");
      }
      
      // Publish to mutation bus for Issues page coherence
      publishMutationResult(result);
      
      // Apply returned state - update personQ with new team
      personQ.setData((prev) => {
        if (!prev) return prev;
        const selectedTeam = teams.find(t => t.id === result.data.teamId);
        return {
          ...prev,
          team: selectedTeam ? { id: selectedTeam.id, name: selectedTeam.name } : null,
        };
      });
      
      toast({ title: "Team updated", description: "The team assignment has been saved successfully." });
      onSave();
    } catch (error: any) {
      console.error("Failed to set team:", error);
      toast({ title: "Failed to update team", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [personId, canWrite, toast, onSave, personQ, teams]);

  // Handle manager change
  const handleManagerChange = useCallback(async (managerId: string | null) => {
    if (!canReporting) {
      console.warn("Cannot change manager: canReporting is false");
      return;
    }
    const newManagerId = managerId === "__none__" || managerId === null ? null : managerId;
    setSelectedManagerId(newManagerId ?? "__none__");
    setManagerPopoverOpen(false);
    setSaving(true);
    
    try {
      const result = await OrgApi.setManager(personId, {
        managerId: newManagerId,
      });
      
      // Check if mutation succeeded
      if (!isMutationSuccess(result)) {
        throw new Error(result.error || "Failed to update manager");
      }
      
      // Publish to mutation bus for Issues page coherence
      publishMutationResult(result);
      
      // Apply returned state - update personQ with new manager from result.data
      personQ.setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          manager: result.data.managerName 
            ? { id: result.data.managerId!, fullName: result.data.managerName }
            : null,
        };
      });
      
      // Dispatch event with updated person data for other listeners
      window.dispatchEvent(new CustomEvent("org:person:updated", {
        detail: {
          personId,
          manager: result.data.managerName 
            ? { id: result.data.managerId, fullName: result.data.managerName }
            : null,
        }
      }));
      
      toast({ title: "Manager updated", description: "The manager assignment has been saved successfully." });
      onSave();
    } catch (error: any) {
      console.error("Failed to set manager:", error);
      toast({ title: "Failed to update manager", description: error?.message || "Please try again.", variant: "destructive" });
      // Revert on error
      setSelectedManagerId(person.manager?.id ?? "__none__");
    } finally {
      setSaving(false);
    }
  }, [personId, person.manager?.id, canReporting, toast, onSave, personQ]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (titleSaveTimerRef.current) clearTimeout(titleSaveTimerRef.current);
      if (nameSaveTimerRef.current) clearTimeout(nameSaveTimerRef.current);
    };
  }, []);

  // Update local state when person prop changes (after refresh)
  useEffect(() => {
    setNameValue(person.fullName ?? "");
    setSelectedManagerId(person.manager?.id ?? "__none__");
  }, [person.fullName, person.manager?.id]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Focus manager field if initialFocusField is "manager"
  useEffect(() => {
    if (initialFocusField === "manager" && managerSelectRef.current) {
      // Small delay to ensure the panel is fully rendered
      setTimeout(() => {
        managerSelectRef.current?.click();
        setManagerPopoverOpen(true);
      }, 150);
    }
  }, [initialFocusField]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Side Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md border-l border-white/10 bg-slate-900 shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Edit profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-slate-800/50 p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Name */}
          {canWrite && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Name</Label>
              <Input
                value={nameValue}
                onChange={(e) => handleNameChange(e.target.value)}
                onBlur={handleNameBlur}
                placeholder="Full name"
                disabled={savingName}
                className="bg-slate-800/50 border-white/10 text-slate-100"
              />
              {savingName && (
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </div>
              )}
            </div>
          )}

          {/* Role / Title */}
          {canWrite && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Role / Title</Label>
              <Input
                value={titleValue}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={handleTitleBlur}
                placeholder="e.g., Product Designer"
                className="bg-slate-800/50 border-white/10 text-slate-100"
              />
            </div>
          )}

          {/* Team */}
          {canWrite && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Team</Label>
              <Select
                value={selectedTeamId}
                onValueChange={handleTeamChange}
                disabled={saving}
              >
                <SelectTrigger className="bg-slate-800/50 border-white/10 text-slate-100">
                  <SelectValue placeholder="Select team…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <span className="text-slate-500 italic">No team</span>
                  </SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Manager */}
          {canReporting && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Manager</Label>
              <Popover open={managerPopoverOpen} onOpenChange={setManagerPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    ref={managerSelectRef}
                    variant="outline"
                    role="combobox"
                    aria-expanded={managerPopoverOpen}
                    disabled={saving}
                    className={cn(
                      "w-full justify-between bg-slate-800/50 border-white/10 text-slate-100 hover:bg-slate-800 hover:text-slate-100",
                      !person.manager && "text-slate-500"
                    )}
                  >
                    <span className="truncate">
                      {person.manager ? person.manager.fullName : "Select manager…"}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-full p-0" 
                  align="start"
                >
                  <div className="flex flex-col">
                    <div className="border-b border-white/10 p-2">
                      <Input
                        placeholder="Search people…"
                        value={managerSearchQuery}
                        onChange={(e) => setManagerSearchQuery(e.target.value)}
                        className="bg-slate-800/50 border-white/10 text-slate-100"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                      {filteredManagerOptions.length === 0 && managerSearchQuery ? (
                        <div className="px-2 py-4 text-center text-sm text-slate-500">
                          No people found.
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log("Clicking no manager");
                              handleManagerChange(null);
                            }}
                            className={cn(
                              "w-full flex items-center px-2 py-1.5 rounded-sm text-sm text-left hover:bg-slate-800/50 transition-colors",
                              !person.manager && "bg-slate-800/30"
                            )}
                          >
                            <CheckIcon
                              className={cn(
                                "mr-2 h-4 w-4 shrink-0",
                                !person.manager ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="text-slate-500 italic">No manager</span>
                          </button>
                          {filteredManagerOptions.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("Clicking manager", p.id);
                                handleManagerChange(p.id);
                              }}
                              className={cn(
                                "w-full flex items-center px-2 py-1.5 rounded-sm text-sm text-left hover:bg-slate-800/50 transition-colors",
                                person.manager?.id === p.id && "bg-slate-800/30"
                              )}
                            >
                              <CheckIcon
                                className={cn(
                                  "mr-2 h-4 w-4 shrink-0",
                                  person.manager?.id === p.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="text-slate-100">{p.fullName}</span>
                                {p.email && (
                                  <span className="text-xs text-slate-500">{p.email}</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {!person.manager && (
                <p className="text-xs text-slate-500">
                  Assign a manager to complete reporting lines.
                </p>
              )}
            </div>
          )}

          {/* Availability & Employment */}
          <PersonAvailabilityCard 
            personId={personId} 
            canEdit={canAvailability}
            onAvailabilityChanged={onPersonChanged}
          />

          {/* Skills */}
          <PersonSkillsCard personId={personId} canEdit={canWrite} />
        </div>
      </div>
    </>
  );
}
