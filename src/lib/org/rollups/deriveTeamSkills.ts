/**
 * Team Skill/Capability Rollups
 * 
 * Phase 3: Aggregates individual skills into team-level capability summaries
 * for LoopBrain reasoning about team coverage and skill gaps.
 */

import { prisma } from "@/lib/db";

// Skill coverage info
export type SkillCoverage = {
  skillId: string;
  skillName: string;
  category: string | null;
  personCount: number;
  highestProficiency: number;
  averageProficiency: number;
  persons: {
    personId: string;
    personName: string | null;
    proficiency: number;
  }[];
};

// Team skill summary
export type TeamSkillSummary = {
  teamId: string;
  teamName?: string;
  
  // Overall stats
  totalMembers: number;
  membersWithSkills: number;
  uniqueSkillCount: number;
  
  // Skill coverage
  skillCoverage: SkillCoverage[];
  
  // Categories covered
  categoriesCovered: string[];
  
  // Risk indicators
  singlePointSkills: SkillCoverage[]; // Skills with only 1 person
  
  // Skill gaps against requirements (if roleCardIds provided)
  skillGaps?: SkillGapInfo[];
};

// Skill gap details
export type SkillGapInfo = {
  skillId: string;
  skillName: string;
  requiredProficiency: number;
  bestAvailable: number | null;
  isCovered: boolean;
  coverageDepth: number; // Number of people who have this skill
};

// Team member with skills
export type TeamMemberWithSkills = {
  personId: string;
  personName: string | null;
  skills: {
    skillId: string;
    skillName: string;
    category: string | null;
    proficiency: number;
  }[];
};

/**
 * Get team members with their skills
 */
export async function getTeamMembersWithSkills(
  workspaceId: string,
  teamId: string
): Promise<TeamMemberWithSkills[]> {
  // Get team positions with users
  const positions = await prisma.orgPosition.findMany({
    where: {
      workspaceId,
      teamId,
      isActive: true,
      userId: { not: null },
    },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });

  const personIds = positions
    .filter((p) => p.user)
    .map((p) => p.userId!);

  if (personIds.length === 0) return [];

  // Get skills for these people
  const personSkills = await prisma.personSkill.findMany({
    where: {
      workspaceId,
      personId: { in: personIds },
    },
    include: {
      skill: true,
    },
  });

  // Group by person
  const skillsByPerson = new Map<string, TeamMemberWithSkills["skills"]>();
  for (const ps of personSkills) {
    if (!skillsByPerson.has(ps.personId)) {
      skillsByPerson.set(ps.personId, []);
    }
    skillsByPerson.get(ps.personId)!.push({
      skillId: ps.skillId,
      skillName: ps.skill.name,
      category: ps.skill.category,
      proficiency: ps.proficiency,
    });
  }

  return positions
    .filter((p) => p.user)
    .map((p) => ({
      personId: p.userId!,
      personName: p.user?.name ?? null,
      skills: skillsByPerson.get(p.userId!) ?? [],
    }));
}

/**
 * Derive team skill summary
 */
export async function deriveTeamSkillSummary(
  workspaceId: string,
  teamId: string,
  options?: {
    teamName?: string;
    roleCardIds?: string[]; // For gap analysis
  }
): Promise<TeamSkillSummary> {
  const members = await getTeamMembersWithSkills(workspaceId, teamId);
  
  // Build skill coverage map
  const skillCoverageMap = new Map<string, {
    skillId: string;
    skillName: string;
    category: string | null;
    persons: { personId: string; personName: string | null; proficiency: number }[];
  }>();

  const categoriesSet = new Set<string>();
  let membersWithSkills = 0;

  for (const member of members) {
    if (member.skills.length > 0) {
      membersWithSkills++;
    }

    for (const skill of member.skills) {
      if (!skillCoverageMap.has(skill.skillId)) {
        skillCoverageMap.set(skill.skillId, {
          skillId: skill.skillId,
          skillName: skill.skillName,
          category: skill.category,
          persons: [],
        });
      }

      skillCoverageMap.get(skill.skillId)!.persons.push({
        personId: member.personId,
        personName: member.personName,
        proficiency: skill.proficiency,
      });

      if (skill.category) {
        categoriesSet.add(skill.category);
      }
    }
  }

  // Convert to coverage array
  const skillCoverage: SkillCoverage[] = [];
  const singlePointSkills: SkillCoverage[] = [];

  for (const [, data] of skillCoverageMap) {
    const personCount = data.persons.length;
    const highestProficiency = Math.max(...data.persons.map((p) => p.proficiency));
    const averageProficiency =
      data.persons.reduce((sum, p) => sum + p.proficiency, 0) / personCount;

    const coverage: SkillCoverage = {
      skillId: data.skillId,
      skillName: data.skillName,
      category: data.category,
      personCount,
      highestProficiency,
      averageProficiency: Math.round(averageProficiency * 10) / 10,
      persons: data.persons.sort((a, b) => b.proficiency - a.proficiency),
    };

    skillCoverage.push(coverage);

    if (personCount === 1) {
      singlePointSkills.push(coverage);
    }
  }

  // Sort coverage by person count (descending) then name
  skillCoverage.sort((a, b) => {
    if (b.personCount !== a.personCount) return b.personCount - a.personCount;
    return a.skillName.localeCompare(b.skillName);
  });

  // Calculate skill gaps if role cards provided
  let skillGaps: SkillGapInfo[] | undefined;
  if (options?.roleCardIds && options.roleCardIds.length > 0) {
    skillGaps = await analyzeTeamSkillGaps(
      workspaceId,
      skillCoverageMap,
      options.roleCardIds
    );
  }

  return {
    teamId,
    teamName: options?.teamName,
    totalMembers: members.length,
    membersWithSkills,
    uniqueSkillCount: skillCoverage.length,
    skillCoverage,
    categoriesCovered: Array.from(categoriesSet).sort(),
    singlePointSkills,
    skillGaps,
  };
}

/**
 * Analyze skill gaps for a team against role card requirements
 */
async function analyzeTeamSkillGaps(
  workspaceId: string,
  skillCoverageMap: Map<string, { skillId: string; persons: { proficiency: number }[] }>,
  roleCardIds: string[]
): Promise<SkillGapInfo[]> {
  // Get required skills from role cards
  const roleCardSkills = await prisma.roleCardSkill.findMany({
    where: {
      roleCardId: { in: roleCardIds },
      type: "REQUIRED",
    },
    include: {
      skill: true,
    },
  });

  const gaps: SkillGapInfo[] = [];
  const processedSkills = new Set<string>();

  for (const rcs of roleCardSkills) {
    if (processedSkills.has(rcs.skillId)) continue;
    processedSkills.add(rcs.skillId);

    const coverage = skillCoverageMap.get(rcs.skillId);
    const bestAvailable = coverage
      ? Math.max(...coverage.persons.map((p) => p.proficiency))
      : null;

    gaps.push({
      skillId: rcs.skillId,
      skillName: rcs.skill.name,
      requiredProficiency: rcs.minProficiency,
      bestAvailable,
      isCovered: bestAvailable !== null && bestAvailable >= rcs.minProficiency,
      coverageDepth: coverage?.persons.length ?? 0,
    });
  }

  // Sort: uncovered first, then by coverage depth
  return gaps.sort((a, b) => {
    if (a.isCovered !== b.isCovered) return a.isCovered ? 1 : -1;
    return a.coverageDepth - b.coverageDepth;
  });
}

// Department skill summary (aggregates teams)
export type DepartmentSkillSummary = {
  departmentId: string;
  departmentName?: string;
  teamSummaries: TeamSkillSummary[];
  
  // Aggregated stats
  totalMembers: number;
  uniqueSkillCount: number;
  categoriesCovered: string[];
  
  // Cross-team single points
  singlePointSkillsAcrossTeams: {
    skillId: string;
    skillName: string;
    teamId: string;
    teamName?: string;
  }[];
};

/**
 * Derive department skill summary
 */
export async function deriveDepartmentSkillSummary(
  workspaceId: string,
  departmentId: string,
  options?: { departmentName?: string }
): Promise<DepartmentSkillSummary> {
  // Get teams in department
  const teams = await prisma.orgTeam.findMany({
    where: {
      workspaceId,
      departmentId,
      isActive: true,
    },
  });

  const teamSummaries: TeamSkillSummary[] = [];
  const allSkillIds = new Set<string>();
  const allCategories = new Set<string>();
  let totalMembers = 0;

  // Track skill coverage across teams
  const skillTeamCount = new Map<string, { skillName: string; teams: string[] }>();

  for (const team of teams) {
    const summary = await deriveTeamSkillSummary(workspaceId, team.id, {
      teamName: team.name,
    });

    teamSummaries.push(summary);
    totalMembers += summary.totalMembers;

    for (const skill of summary.skillCoverage) {
      allSkillIds.add(skill.skillId);
      if (skill.category) allCategories.add(skill.category);

      if (!skillTeamCount.has(skill.skillId)) {
        skillTeamCount.set(skill.skillId, { skillName: skill.skillName, teams: [] });
      }
      skillTeamCount.get(skill.skillId)!.teams.push(team.id);
    }
  }

  // Find skills that exist in only one team across department
  const singlePointSkillsAcrossTeams: DepartmentSkillSummary["singlePointSkillsAcrossTeams"] = [];
  for (const [skillId, data] of skillTeamCount) {
    if (data.teams.length === 1) {
      const team = teams.find((t) => t.id === data.teams[0]);
      singlePointSkillsAcrossTeams.push({
        skillId,
        skillName: data.skillName,
        teamId: data.teams[0],
        teamName: team?.name,
      });
    }
  }

  return {
    departmentId,
    departmentName: options?.departmentName,
    teamSummaries,
    totalMembers,
    uniqueSkillCount: allSkillIds.size,
    categoriesCovered: Array.from(allCategories).sort(),
    singlePointSkillsAcrossTeams,
  };
}

/**
 * Find teams that have a specific skill
 */
export async function findTeamsWithSkill(
  workspaceId: string,
  skillId: string,
  options?: { minProficiency?: number }
): Promise<{ teamId: string; teamName: string; personCount: number; highestProficiency: number }[]> {
  const minProficiency = options?.minProficiency ?? 1;

  // Get all person skills for this skill
  const personSkills = await prisma.personSkill.findMany({
    where: {
      workspaceId,
      skillId,
      proficiency: { gte: minProficiency },
    },
  });

  const personIds = personSkills.map((ps) => ps.personId);

  // Get positions for these people
  const positions = await prisma.orgPosition.findMany({
    where: {
      workspaceId,
      userId: { in: personIds },
      teamId: { not: null },
      isActive: true,
    },
    include: {
      team: true,
    },
  });

  // Group by team
  const teamData = new Map<string, { name: string; persons: Set<string>; maxProf: number }>();

  for (const pos of positions) {
    if (!pos.team) continue;

    if (!teamData.has(pos.team.id)) {
      teamData.set(pos.team.id, {
        name: pos.team.name,
        persons: new Set(),
        maxProf: 0,
      });
    }

    const td = teamData.get(pos.team.id)!;
    td.persons.add(pos.userId!);

    const personSkill = personSkills.find((ps) => ps.personId === pos.userId);
    if (personSkill && personSkill.proficiency > td.maxProf) {
      td.maxProf = personSkill.proficiency;
    }
  }

  return Array.from(teamData.entries())
    .map(([teamId, data]) => ({
      teamId,
      teamName: data.name,
      personCount: data.persons.size,
      highestProficiency: data.maxProf,
    }))
    .sort((a, b) => b.personCount - a.personCount);
}

/**
 * Format skill coverage for display
 */
export function formatSkillCoverage(coverage: SkillCoverage): string {
  const profLevel = coverage.highestProficiency >= 4 ? "Expert" : 
                    coverage.highestProficiency >= 3 ? "Proficient" : "Beginner";
  return `${coverage.skillName}: ${coverage.personCount} person(s), ${profLevel}`;
}

/**
 * Check if a team has single-point-of-failure skills
 */
export function hasSinglePointRisks(summary: TeamSkillSummary): boolean {
  return summary.singlePointSkills.length > 0;
}

