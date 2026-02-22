"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Star, CheckCircle, FolderOpen, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { orgTokens } from "@/components/org/ui/tokens";
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
  };
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

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl border bg-[#0B1220] animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-sm text-slate-500">{error ?? "No role data available"}</p>
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

  return (
    <div className="space-y-4">
      {/* Role Template Section */}
      {(template || responsibilities.length > 0) && (
        <Card className="border-[#1e293b] bg-[#0B1220]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-50">
              <Briefcase className="h-5 w-5" />
              Role Definition
              {template && (
                <Badge variant="outline" className="ml-auto text-xs border-slate-600 text-slate-400">
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
                <p className={cn(orgTokens.title, "mb-2 text-slate-300")}>Responsibilities</p>
                <ul className="space-y-1">
                  {responsibilities.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
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
                <p className={cn(orgTokens.title, "mb-2 text-slate-300")}>Required Skills</p>
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
                <p className={cn(orgTokens.title, "mb-2 text-slate-300")}>Preferred Skills</p>
                <div className="flex flex-wrap gap-2">
                  {preferredSkillRefs.length > 0
                    ? preferredSkillRefs.map((sr) => (
                        <Badge
                          key={sr.id}
                          variant="outline"
                          className="border-slate-600 text-slate-400 text-xs"
                        >
                          {sr.skill.name}
                        </Badge>
                      ))
                    : preferredSkills.map((s, i) => (
                        <Badge key={i} variant="outline" className="border-slate-600 text-slate-400 text-xs">
                          {s}
                        </Badge>
                      ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* My Skills Section */}
      <Card className="border-[#1e293b] bg-[#0B1220]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-50">
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
                    className="border-slate-600 text-slate-300 text-xs"
                  >
                    {s.name}
                    {s.proficiency >= 4 && (
                      <span className="ml-1 text-amber-400">★</span>
                    )}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-slate-500">No skills declared yet</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Work Section */}
      <Card className="border-[#1e293b] bg-[#0B1220]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-50">
            <FolderOpen className="h-5 w-5" />
            Current Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active projects */}
          {data.currentWork.projects.length > 0 ? (
            <div>
              <p className={cn(orgTokens.title, "mb-2 text-slate-300")}>Active Projects</p>
              <div className="space-y-1">
                {data.currentWork.projects.map((p) => (
                  <div
                    key={p.allocationId}
                    className="flex items-center justify-between text-sm text-slate-400"
                  >
                    <span>{p.projectName}</span>
                    <Badge variant="outline" className="border-slate-700 text-slate-500 text-xs">
                      {Math.round(p.fraction * 100)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No active project allocations</p>
          )}

          {/* Task counts */}
          <div className="flex items-center gap-4 pt-1">
            <ListTodo className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-400">
              <span className="font-medium text-slate-200">
                {data.currentWork.taskCounts.inProgress}
              </span>{" "}
              in progress
            </span>
            <span className="text-sm text-slate-400">
              <span className="font-medium text-slate-200">
                {data.currentWork.taskCounts.todo}
              </span>{" "}
              to do
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
