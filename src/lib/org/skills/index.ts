/**
 * Skills Module
 * 
 * Phase 3: Central exports for skill queries and management
 */

export {
  getWorkspaceSkills,
  getSkillsByCategory,
  searchSkills,
  findPeopleWithSkill,
  findPeopleWithSkillByName,
  getPersonSkills,
  getSkillCategories,
  personHasSkill,
  getRoleCardSkillRequirements,
  analyzePersonSkillGaps,
  getOrCreateSkill,
  addPersonSkill,
  removePersonSkill,
  type SkillWithCount,
  type PersonSkillRecord,
  type SkillGap,
} from "./skillQueries";

