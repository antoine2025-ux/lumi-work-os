"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase, Star, CheckCircle, FolderOpen, ListTodo, FileText, Link2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { orgTokens } from "@/components/org/ui/tokens";
import { useCurrentOrgRole } from "@/hooks/useCurrentOrgRole";
import { SkillsEditor } from "./SkillsEditor";

// ─── Types ──────────────────────────────────────────────────────────────────

type SkillRef = {
  id: string;
  type: "REQUIRED" | "PREFERRED";
  minProficiency: number;
  skill: { id: string; name: string; category: string | null };
};

type PersonSkill = {
  id: string;
  skillId: string;
  name: string;
  category: string | null;
  proficiency: number;
  source: string;
  verifiedAt: string | null;
};

type JobDescriptionData = {
  id: string;
  title: string;
  summary: string | null;
  level: string | null;
  jobFamily: string | null;
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  keyMetrics: string[];
};

type RoleCardData = {
  id: string;
  roleName: string;
  jobFamily: string;
  level: string;
  roleDescription: string;
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  keyMetrics: string[];
  skillRefs: SkillRef[];
  roleInOrg: string | null;
  focusArea: string | null;
  managerNotes: string | null;
};

type RoleCardViewData = {
  person: {
    userId: string;
    positionId: string;
    positionTitle: string | null;
    responsibilities: string[];
    requiredSkills: string[];
    preferredSkills: string[];
  };
  jobDescription: JobDescriptionData | null;
  roleCard: RoleCardData | null;
  skills: PersonSkill[];
  currentWork: {
    projects: Array<{
      allocationId: string;
      projectId: string;
      projectName: string;
      fraction: number;
    }>;
    taskCounts: { todo: number; inProgress: number };
  } | null;
};

// ─── JD list item (for selector) ─────────────────────────────────────────────

type JDListItem = {
  id: string;
  title: string;
  level: string | null;
  jobFamily: string | null;
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface RoleCardViewProps {
  /** User ID of the person whose role card to show */
  personUserId: string;
  /** Whether this viewer can edit the skills (own profile) */
  isOwnProfile: boolean;
}

// ─── Proficiency label ────────────────────────────────────────────────────────

function proficiencyLabel(level: number): string {
  const labels = ["", "Beginner", "Developing", "Proficient", "Advanced", "Expert"];
  return labels[Math.min(5, Math.max(1, level))] ?? "Proficient";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RoleCardView({ personUserId, isOwnProfile }: RoleCardViewProps) {
  const [data, setData] = useState<RoleCardViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin JD linking state
  const { role } = useCurrentOrgRole();
  const isAdmin = role === "ADMIN" || role === "OWNER";
  const [jdList, setJdList] = useState<JDListItem[]>([]);
  const [jdListLoading, setJdListLoading] = useState(false);
  const [savingJd, setSavingJd] = useState(false);
  const [jdError, setJdError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/org/people/${personUserId}/role-card`);
      if (!res.ok) {
        setError("Failed to load role card");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      setError("Failed to load role card");
    } finally {
      setLoading(false);
    }
  }, [personUserId]);

  useEffect(() => {
    load();
  }, [load]);

  // Load JD list for admin selector
  useEffect(() => {
    if (!isAdmin) return;
    setJdListLoading(true);
    fetch("/api/org/job-descriptions")
      .then((r) => r.json())
      .then((d) => setJdList(d.jobDescriptions ?? []))
      .catch(() => {})
      .finally(() => setJdListLoading(false));
  }, [isAdmin]);

  const handleJdChange = useCallback(
    async (value: string) => {
      if (!data) return;
      const jobDescriptionId = value === "__none__" ? null : value;
      setSavingJd(true);
      setJdError(null);
      try {
        const res = await fetch(
          `/api/org/positions/${data.person.positionId}/job-description`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobDescriptionId }),
          }
        );
        const json = await res.json();
        if (!res.ok) {
          setJdError(json.error ?? "Failed to update");
          return;
        }
        await load();
      } catch {
        setJdError("Failed to update");
      } finally {
        setSavingJd(false);
      }
    },
    [data, load]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-sm text-muted-foreground">{error ?? "No role data available"}</p>
    );
  }

  const template = data.roleCard;
  // Merge template responsibilities/skills with position-level fallback
  const responsibilities =
    (template?.responsibilities.length ? template.responsibilities : data.person.responsibilities) ?? [];
  const requiredSkills =
    (template?.requiredSkills.length ? template.requiredSkills : data.person.requiredSkills) ?? [];
  const preferredSkills =
    (template?.preferredSkills.length ? template.preferredSkills : data.person.preferredSkills) ?? [];

  // Normalized skill refs from junction table (more precise)
  const requiredSkillRefs = template?.skillRefs.filter((s) => s.type === "REQUIRED") ?? [];
  const preferredSkillRefs = template?.skillRefs.filter((s) => s.type === "PREFERRED") ?? [];

  const jd = data.jobDescription;

  return (
    <div className="space-y-4">
      {/* Admin: JD linking selector */}
      {isAdmin && (
        <Card className="border-border bg-card">
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  Linked Job Description
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={jd?.id ?? "__none__"}
                  onValueChange={handleJdChange}
                  disabled={savingJd || jdListLoading || !data}
                >
                  <SelectTrigger className="h-7 text-xs w-52 border-border bg-transparent text-muted-foreground">
                    <SelectValue placeholder="Not linked" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground italic">Not linked</span>
                    </SelectItem>
                    {jdList.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title}
                        {(item.level || item.jobFamily) && (
                          <span className="ml-1 text-muted-foreground text-xs">
                            · {[item.jobFamily, item.level].filter(Boolean).join(" ")}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {savingJd && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>
            </div>
            {jdError && (
              <p className="mt-2 text-xs text-red-400">{jdError}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Job Description card — shared template linked to this position */}
      {jd && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <FileText className="h-5 w-5" />
              Job Description
              <Badge variant="outline" className="ml-auto text-xs border-slate-600 text-muted-foreground">
                {[jd.jobFamily, jd.level].filter(Boolean).join(" · ")}
              </Badge>
            </CardTitle>
            {jd.summary && (
              <p className={cn(orgTokens.subtleText, "mt-1")}>{jd.summary}</p>
            )}
          </CardHeader>
          {(jd.responsibilities.length > 0 || jd.requiredSkills.length > 0 || jd.preferredSkills.length > 0) && (
            <CardContent className="space-y-4">
              {jd.responsibilities.length > 0 && (
                <div>
                  <p className={cn(orgTokens.title, "mb-2 text-muted-foreground")}>Responsibilities</p>
                  <ul className="space-y-1">
                    {jd.responsibilities.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {jd.requiredSkills.length > 0 && (
                <div>
                  <p className={cn(orgTokens.title, "mb-2 text-muted-foreground")}>Required</p>
                  <div className="flex flex-wrap gap-2">
                    {jd.requiredSkills.map((s, i) => (
                      <Badge key={i} variant="outline" className="border-blue-800 text-blue-300 text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {jd.preferredSkills.length > 0 && (
                <div>
                  <p className={cn(orgTokens.title, "mb-2 text-muted-foreground")}>Preferred</p>
                  <div className="flex flex-wrap gap-2">
                    {jd.preferredSkills.map((s, i) => (
                      <Badge key={i} variant="outline" className="border-slate-600 text-muted-foreground text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Role Definition card — person-specific, manager-authored */}
      {(template || responsibilities.length > 0) && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Briefcase className="h-5 w-5" />
              Role Definition
              {template && (
                <Badge variant="outline" className="ml-auto text-xs border-slate-600 text-muted-foreground">
                  {template.jobFamily} · {template.level}
                </Badge>
              )}
            </CardTitle>
            {template?.roleDescription && (
              <p className={cn(orgTokens.subtleText, "mt-1")}>{template.roleDescription}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {responsibilities.length > 0 && (
              <div>
                <p className={cn(orgTokens.title, "mb-2 text-muted-foreground")}>Responsibilities</p>
                <ul className="space-y-1">
                  {responsibilities.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Expected skills from template */}
            {(requiredSkillRefs.length > 0 || requiredSkills.length > 0) && (
              <div>
                <p className={cn(orgTokens.title, "mb-2 text-muted-foreground")}>Required Skills</p>
                <div className="flex flex-wrap gap-2">
                  {requiredSkillRefs.length > 0
                    ? requiredSkillRefs.map((sr) => (
                        <Badge
                          key={sr.id}
                          variant="outline"
                          className="border-blue-800 text-blue-300 text-xs"
                        >
                          {sr.skill.name}
                          {sr.minProficiency > 1 && (
                            <span className="ml-1 text-blue-500">
                              · {proficiencyLabel(sr.minProficiency)}+
                            </span>
                          )}
                        </Badge>
                      ))
                    : requiredSkills.map((s, i) => (
                        <Badge key={i} variant="outline" className="border-blue-800 text-blue-300 text-xs">
                          {s}
                        </Badge>
                      ))}
                </div>
              </div>
            )}

            {(preferredSkillRefs.length > 0 || preferredSkills.length > 0) && (
              <div>
                <p className={cn(orgTokens.title, "mb-2 text-muted-foreground")}>Preferred Skills</p>
                <div className="flex flex-wrap gap-2">
                  {preferredSkillRefs.length > 0
                    ? preferredSkillRefs.map((sr) => (
                        <Badge
                          key={sr.id}
                          variant="outline"
                          className="border-slate-600 text-muted-foreground text-xs"
                        >
                          {sr.skill.name}
                        </Badge>
                      ))
                    : preferredSkills.map((s, i) => (
                        <Badge key={i} variant="outline" className="border-slate-600 text-muted-foreground text-xs">
                          {s}
                        </Badge>
                      ))}
                </div>
              </div>
            )}

            {/* Manager-authored context fields */}
            {template?.roleInOrg && (
              <div>
                <p className={cn(orgTokens.title, "mb-1 text-muted-foreground text-xs uppercase tracking-wide")}>Role in Org</p>
                <p className="text-sm text-muted-foreground">{template.roleInOrg}</p>
              </div>
            )}
            {template?.focusArea && (
              <div>
                <p className={cn(orgTokens.title, "mb-1 text-muted-foreground text-xs uppercase tracking-wide")}>Focus Area</p>
                <p className="text-sm text-muted-foreground">{template.focusArea}</p>
              </div>
            )}
            {template?.managerNotes && (
              <div>
                <p className={cn(orgTokens.title, "mb-1 text-muted-foreground text-xs uppercase tracking-wide")}>Manager Notes</p>
                <p className="text-sm text-muted-foreground italic">&ldquo;{template.managerNotes}&rdquo;</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* My Skills Section */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Star className="h-5 w-5" />
            {isOwnProfile ? "My Skills" : "Skills"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isOwnProfile ? (
            <SkillsEditor
              personUserId={personUserId}
              initialSkills={data.skills}
              onSkillsChanged={load}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.skills.length > 0 ? (
                data.skills.map((s) => (
                  <Badge
                    key={s.id}
                    variant="outline"
                    className="border-slate-600 text-muted-foreground text-xs"
                  >
                    {s.name}
                    {s.proficiency >= 4 && (
                      <span className="ml-1 text-amber-400">★</span>
                    )}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No skills declared yet</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Work Section — only shown when viewer has access (self/manager/admin) */}
      {data.currentWork && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <FolderOpen className="h-5 w-5" />
              Current Work
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.currentWork.projects.length > 0 ? (
              <div>
                <p className={cn(orgTokens.title, "mb-2 text-muted-foreground")}>Active Projects</p>
                <div className="space-y-1">
                  {data.currentWork.projects.map((p) => (
                    <div
                      key={p.allocationId}
                      className="flex items-center justify-between text-sm text-muted-foreground"
                    >
                      <span>{p.projectName}</span>
                      <Badge variant="outline" className="border-border text-muted-foreground text-xs">
                        {Math.round(p.fraction * 100)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active project allocations</p>
            )}

            <div className="flex items-center gap-4 pt-1">
              <ListTodo className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {data.currentWork.taskCounts.inProgress}
                </span>{" "}
                in progress
              </span>
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {data.currentWork.taskCounts.todo}
                </span>{" "}
                to do
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
