/**
 * Skill Query Functions
 * 
 * Phase 3: Skill lookup and search functions for LoopBrain reasoning.
 * Provides queries for finding people by skill, team capabilities, and skill gaps.
 */

import { prisma } from "@/lib/db";

// Skill with person count
export type SkillWithCount = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  personCount: number;
};

// Person skill record
export type PersonSkillRecord = {
  personId: string;
  personName: string | null;
  personEmail: string;
  skillId: string;
  skillName: string;
  proficiency: number;
  source: string;
  verifiedAt: Date | null;
};

// Skill gap analysis result
export type SkillGap = {
  skillId: string;
  skillName: string;
  requiredProficiency: number;
  bestAvailableProficiency: number | null;
  gap: number; // Difference between required and best available
  personsWithSkill: number;
};

/**
 * Get all skills for a workspace with person counts
 */
export async function getWorkspaceSkills(
  workspaceId: string
): Promise<SkillWithCount[]> {
  const skills = await prisma.skill.findMany({
    where: { workspaceId },
    include: {
      _count: {
        select: { personSkills: true },
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return skills.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    description: s.description,
    personCount: s._count.personSkills,
  }));
}

/**
 * Get skills by category
 */
export async function getSkillsByCategory(
  workspaceId: string,
  category: string
): Promise<SkillWithCount[]> {
  const skills = await prisma.skill.findMany({
    where: { workspaceId, category },
    include: {
      _count: {
        select: { personSkills: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return skills.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    description: s.description,
    personCount: s._count.personSkills,
  }));
}

/**
 * Search skills by name
 */
export async function searchSkills(
  workspaceId: string,
  query: string,
  limit: number = 20
): Promise<SkillWithCount[]> {
  const skills = await prisma.skill.findMany({
    where: {
      workspaceId,
      name: { contains: query, mode: "insensitive" },
    },
    include: {
      _count: {
        select: { personSkills: true },
      },
    },
    orderBy: { name: "asc" },
    take: limit,
  });

  return skills.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    description: s.description,
    personCount: s._count.personSkills,
  }));
}

/**
 * Find people with a specific skill
 */
export async function findPeopleWithSkill(
  workspaceId: string,
  skillId: string,
  options?: {
    minProficiency?: number;
    limit?: number;
  }
): Promise<PersonSkillRecord[]> {
  const minProficiency = options?.minProficiency ?? 1;
  const limit = options?.limit ?? 100;

  const personSkills = await prisma.personSkill.findMany({
    where: {
      workspaceId,
      skillId,
      proficiency: { gte: minProficiency },
    },
    include: {
      skill: true,
    },
    orderBy: { proficiency: "desc" },
    take: limit,
  });

  // Get person details
  const personIds = personSkills.map((ps) => ps.personId);
  const persons = await prisma.user.findMany({
    where: { id: { in: personIds } },
    select: { id: true, name: true, email: true },
  });
  const personMap = new Map(persons.map((p) => [p.id, p]));

  return personSkills.map((ps) => {
    const person = personMap.get(ps.personId);
    return {
      personId: ps.personId,
      personName: person?.name ?? null,
      personEmail: person?.email ?? "",
      skillId: ps.skillId,
      skillName: ps.skill.name,
      proficiency: ps.proficiency,
      source: ps.source,
      verifiedAt: ps.verifiedAt,
    };
  });
}

/**
 * Find people with a skill by name (fuzzy match)
 */
export async function findPeopleWithSkillByName(
  workspaceId: string,
  skillName: string,
  options?: {
    minProficiency?: number;
    limit?: number;
  }
): Promise<PersonSkillRecord[]> {
  // First find matching skills
  const skills = await prisma.skill.findMany({
    where: {
      workspaceId,
      name: { contains: skillName, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (skills.length === 0) return [];

  const skillIds = skills.map((s) => s.id);
  const minProficiency = options?.minProficiency ?? 1;
  const limit = options?.limit ?? 100;

  const personSkills = await prisma.personSkill.findMany({
    where: {
      workspaceId,
      skillId: { in: skillIds },
      proficiency: { gte: minProficiency },
    },
    include: {
      skill: true,
    },
    orderBy: { proficiency: "desc" },
    take: limit,
  });

  // Get person details
  const personIds = personSkills.map((ps) => ps.personId);
  const persons = await prisma.user.findMany({
    where: { id: { in: personIds } },
    select: { id: true, name: true, email: true },
  });
  const personMap = new Map(persons.map((p) => [p.id, p]));

  return personSkills.map((ps) => {
    const person = personMap.get(ps.personId);
    return {
      personId: ps.personId,
      personName: person?.name ?? null,
      personEmail: person?.email ?? "",
      skillId: ps.skillId,
      skillName: ps.skill.name,
      proficiency: ps.proficiency,
      source: ps.source,
      verifiedAt: ps.verifiedAt,
    };
  });
}

/**
 * Get all skills for a person
 */
export async function getPersonSkills(
  workspaceId: string,
  personId: string
): Promise<PersonSkillRecord[]> {
  const personSkills = await prisma.personSkill.findMany({
    where: { workspaceId, personId },
    include: {
      skill: true,
    },
    orderBy: [{ proficiency: "desc" }, { skill: { name: "asc" } }],
  });

  const person = await prisma.user.findUnique({
    where: { id: personId },
    select: { name: true, email: true },
  });

  return personSkills.map((ps) => ({
    personId,
    personName: person?.name ?? null,
    personEmail: person?.email ?? "",
    skillId: ps.skillId,
    skillName: ps.skill.name,
    proficiency: ps.proficiency,
    source: ps.source,
    verifiedAt: ps.verifiedAt,
  }));
}

/**
 * Get skill categories for a workspace
 */
export async function getSkillCategories(workspaceId: string): Promise<string[]> {
  const skills = await prisma.skill.findMany({
    where: { workspaceId, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  return skills.map((s) => s.category!).filter(Boolean);
}

/**
 * Check if a person has a specific skill at minimum proficiency
 */
export async function personHasSkill(
  workspaceId: string,
  personId: string,
  skillId: string,
  minProficiency: number = 1
): Promise<boolean> {
  const personSkill = await prisma.personSkill.findFirst({
    where: {
      workspaceId,
      personId,
      skillId,
      proficiency: { gte: minProficiency },
    },
  });

  return personSkill !== null;
}

/**
 * Get role card skill requirements
 */
export async function getRoleCardSkillRequirements(roleCardId: string): Promise<{
  required: { skillId: string; skillName: string; minProficiency: number }[];
  preferred: { skillId: string; skillName: string; minProficiency: number }[];
}> {
  const skillRefs = await prisma.roleCardSkill.findMany({
    where: { roleCardId },
    include: {
      skill: true,
    },
  });

  const required = skillRefs
    .filter((s) => s.type === "REQUIRED")
    .map((s) => ({
      skillId: s.skillId,
      skillName: s.skill.name,
      minProficiency: s.minProficiency,
    }));

  const preferred = skillRefs
    .filter((s) => s.type === "PREFERRED")
    .map((s) => ({
      skillId: s.skillId,
      skillName: s.skill.name,
      minProficiency: s.minProficiency,
    }));

  return { required, preferred };
}

/**
 * Analyze skill gaps for a person against a role card
 */
export async function analyzePersonSkillGaps(
  workspaceId: string,
  personId: string,
  roleCardId: string
): Promise<SkillGap[]> {
  const requirements = await getRoleCardSkillRequirements(roleCardId);
  const personSkills = await getPersonSkills(workspaceId, personId);
  const personSkillMap = new Map(personSkills.map((s) => [s.skillId, s]));

  const gaps: SkillGap[] = [];

  for (const req of requirements.required) {
    const personSkill = personSkillMap.get(req.skillId);
    const currentProficiency = personSkill?.proficiency ?? 0;
    const gap = req.minProficiency - currentProficiency;

    if (gap > 0) {
      gaps.push({
        skillId: req.skillId,
        skillName: req.skillName,
        requiredProficiency: req.minProficiency,
        bestAvailableProficiency: currentProficiency > 0 ? currentProficiency : null,
        gap,
        personsWithSkill: 1, // This person specifically
      });
    }
  }

  return gaps.sort((a, b) => b.gap - a.gap);
}

/**
 * Get or create a skill by name
 */
export async function getOrCreateSkill(
  workspaceId: string,
  name: string,
  category?: string
): Promise<{ id: string; name: string; category: string | null; created: boolean }> {
  // Try to find existing skill
  const existing = await prisma.skill.findFirst({
    where: {
      workspaceId,
      name: { equals: name, mode: "insensitive" },
    },
  });

  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      category: existing.category,
      created: false,
    };
  }

  // Create new skill
  const created = await prisma.skill.create({
    data: {
      workspaceId,
      name,
      category: category ?? null,
    },
  });

  return {
    id: created.id,
    name: created.name,
    category: created.category,
    created: true,
  };
}

/**
 * Add a skill to a person
 */
export async function addPersonSkill(
  workspaceId: string,
  personId: string,
  skillId: string,
  options?: {
    proficiency?: number;
    source?: "SELF_REPORTED" | "MANAGER_ADDED" | "VERIFIED" | "INFERRED";
    verifiedById?: string;
  }
): Promise<void> {
  const proficiency = options?.proficiency ?? 3;
  const source = options?.source ?? "SELF_REPORTED";

  await prisma.personSkill.upsert({
    where: {
      workspaceId_personId_skillId: {
        workspaceId,
        personId,
        skillId,
      },
    },
    update: {
      proficiency,
      source,
      verifiedAt: source === "VERIFIED" ? new Date() : undefined,
      verifiedById: options?.verifiedById,
    },
    create: {
      workspaceId,
      personId,
      skillId,
      proficiency,
      source,
      verifiedAt: source === "VERIFIED" ? new Date() : null,
      verifiedById: options?.verifiedById,
    },
  });
}

/**
 * Remove a skill from a person
 */
export async function removePersonSkill(
  workspaceId: string,
  personId: string,
  skillId: string
): Promise<void> {
  await prisma.personSkill.deleteMany({
    where: { workspaceId, personId, skillId },
  });
}

