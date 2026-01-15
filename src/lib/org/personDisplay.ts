/**
 * Person Display Helpers
 * 
 * Utilities for deriving display names and initials from person data.
 * Handles various name formats and email fallbacks.
 */

export type PersonNameSource = {
  fullName?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

/**
 * Derives a display name from person data, with intelligent fallbacks.
 * 
 * Priority:
 * 1. fullName or name (if exists and not empty)
 * 2. firstName + lastName (if both exist)
 * 3. Derived from email local-part (e.g. "jana.doe@org.local" -> "Jana Doe")
 * 4. "Unknown" only if absolutely nothing exists
 */
export function getDisplayName(source: PersonNameSource): string {
  // 1. Use fullName or name if available
  const name = source.fullName || source.name;
  if (name && name.trim()) {
    return name.trim();
  }

  // 2. Combine firstName + lastName if both exist
  if (source.firstName && source.lastName) {
    return `${source.firstName.trim()} ${source.lastName.trim()}`;
  }
  if (source.firstName) {
    return source.firstName.trim();
  }
  if (source.lastName) {
    return source.lastName.trim();
  }

  // 3. Derive from email local-part
  if (source.email) {
    const emailLocalPart = source.email.split("@")[0];
    if (emailLocalPart) {
      // Split by common separators: ., -, _
      const tokens = emailLocalPart.split(/[._-]/);
      if (tokens.length > 1) {
        // Multiple tokens: capitalize each and join
        // e.g. "jana.doe" -> "Jana Doe"
        return tokens
          .map((token) => {
            if (!token) return "";
            return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
          })
          .filter(Boolean)
          .join(" ");
      } else {
        // Single token: capitalize first letter
        // e.g. "skvortsovaleksei" -> "Skvortsovaleksei"
        return emailLocalPart.charAt(0).toUpperCase() + emailLocalPart.slice(1);
      }
    }
  }

  // 4. Absolute fallback - return empty string instead of "Unknown"
  return "";
}

/**
 * Derives initials from display name or email.
 * Never returns "?" - always generates initials from available data.
 * 
 * Priority:
 * 1. If displayName has 2+ words -> first letter of first 2 words (e.g. "Jana Doe" -> "JD")
 * 2. If displayName has 1 word -> first 2 letters (e.g. "John" -> "JO")
 * 3. If email exists -> derive from email local-part tokens
 * 4. Fallback to first available character from name or email
 */
export function getInitials(source: PersonNameSource): string {
  const displayName = getDisplayName(source);

  // Normal case: derive from display name
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  
  if (parts.length >= 2) {
    // Multiple words: use first letter of first 2 words
    const first = parts[0]?.[0]?.toUpperCase();
    const last = parts[parts.length - 1]?.[0]?.toUpperCase();
    if (first && last) {
      return `${first}${last}`;
    }
  }
  
  if (parts.length === 1) {
    // Single word: use first 2 letters if available, otherwise first letter
    const word = parts[0];
    if (word.length >= 2) {
      return word.substring(0, 2).toUpperCase();
    }
    if (word.length === 1) {
      return word.charAt(0).toUpperCase();
    }
  }

  // Fallback: try to derive from email
  if (source.email) {
    const emailLocalPart = source.email.split("@")[0];
    if (emailLocalPart) {
      const tokens = emailLocalPart.split(/[._-]/);
      if (tokens.length >= 2) {
        // Use first letter of first 2 tokens
        const first = tokens[0]?.[0]?.toUpperCase();
        const second = tokens[1]?.[0]?.toUpperCase();
        if (first && second) {
          return `${first}${second}`;
        }
      } else if (tokens.length === 1 && tokens[0]?.length >= 2) {
        // Use first 2 letters of single token
        return tokens[0].substring(0, 2).toUpperCase();
      } else if (tokens.length === 1 && tokens[0]?.length === 1) {
        // Single character token
        return tokens[0].charAt(0).toUpperCase();
      }
    }
  }

  // Last resort: try to get any character from name fields
  const name = source.fullName || source.name || source.firstName || source.lastName;
  if (name && name.trim().length > 0) {
    const firstChar = name.trim().charAt(0).toUpperCase();
    if (name.trim().length >= 2) {
      return firstChar + name.trim().charAt(1).toUpperCase();
    }
    return firstChar;
  }

  // Absolute fallback: use "U" for Unknown (better than "?")
  return "U";
}

/**
 * Generates a consistent gradient color for avatar backgrounds based on a string seed.
 */
export function generateAvatarGradient(seed: string): string {
  // Generate a simple hash from the string
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate hue from hash (0-360)
  const hue = Math.abs(hash % 360);
  
  // Use a fixed saturation and lightness for consistent, muted colors
  return `hsl(${hue}, 50%, 45%)`;
}

/**
 * Person data source for team/department display
 */
export type PersonTeamDeptSource = {
  team?: string | { name: string } | null;
  department?: string | { name: string } | null;
};

/**
 * Displays team and/or department in a clean format.
 * Returns null if neither exists (never shows "Unassigned" or "Unknown").
 * 
 * @param source - Person data with team/department
 * @returns Formatted string or null
 */
/**
 * Checks if a string value should be treated as "missing" (empty/placeholder).
 * Filters out "Unassigned", "Unknown", and other placeholder values.
 */
function isValidValue(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  // Filter out placeholder values (case-insensitive, handles variations)
  const placeholders = ["unassigned", "unknown", "none", "n/a", "—", "–", "—", "not set", "not assigned", "missing"];
  return !placeholders.includes(normalized) && normalized.length > 0;
}

export function displayTeamDept(source: PersonTeamDeptSource): string | null {
  // Extract team name (handle both string and object formats)
  const teamNameRaw = typeof source.team === "object" && source.team !== null
    ? source.team.name
    : source.team;
  
  // Extract department name (handle both string and object formats)
  const departmentNameRaw = typeof source.department === "object" && source.department !== null
    ? source.department.name
    : source.department;

  // Filter out placeholder values like "Unassigned" or "Unknown"
  const teamName = isValidValue(teamNameRaw) ? teamNameRaw : null;
  const departmentName = isValidValue(departmentNameRaw) ? departmentNameRaw : null;

  // Both exist: "Team · Department"
  if (teamName && departmentName) {
    return `${teamName} · ${departmentName}`;
  }
  
  // Only team exists
  if (teamName) {
    return teamName;
  }
  
  // Only department exists
  if (departmentName) {
    return departmentName;
  }
  
  // Neither exists: return null (don't show anything)
  return null;
}

/**
 * Person data source for completeness check
 */
export type PersonCompletenessSource = {
  name?: string | null;
  fullName?: string | null;
  title?: string | null;
  role?: string | null;
  team?: string | { name: string } | null;
  department?: string | { name: string } | null;
  manager?: { name?: string | null } | null;
};

/**
 * Checks if a person's profile is incomplete.
 * Required fields: name, title, team OR department (at least one).
 * Manager is optional but counted as missing if not present.
 * 
 * @param source - Person data
 * @returns Object with isIncomplete flag and missing fields array
 * @deprecated Use getPersonDisplayBadges instead for UI display
 */
export function checkPersonCompleteness(source: PersonCompletenessSource): {
  isIncomplete: boolean;
  missingFields: string[];
} {
  const missing: string[] = [];
  
  // Check name
  const displayName = getDisplayName({
    fullName: source.fullName,
    name: source.name,
    email: null, // Don't use email as name fallback for completeness check
  });
  if (!displayName || displayName.trim() === "") {
    missing.push("Name");
  }
  
  // Check title
  if (!source.title && !source.role) {
    missing.push("Title");
  }
  
  // Check team or department (at least one required)
  const teamName = typeof source.team === "object" && source.team !== null
    ? source.team.name
    : source.team;
  const departmentName = typeof source.department === "object" && source.department !== null
    ? source.department.name
    : source.department;
  
  // If both are missing, add both to the missing list for clearer tooltip
  if (!teamName && !departmentName) {
    missing.push("Team");
    missing.push("Department");
  }
  
  // Check manager (optional but counted)
  const managerName = source.manager?.name;
  if (!managerName) {
    missing.push("Manager");
  }
  
  return {
    isIncomplete: missing.length > 0,
    missingFields: missing,
  };
}

/**
 * Person data source for display badges
 */
export type PersonBadgeSource = {
  team?: string | { name: string } | null;
  department?: string | { name: string } | null;
  title?: string | null;
  role?: string | null;
  manager?: { name?: string | null; fullName?: string | null; id?: string | null } | null;
  managerId?: string | null;
};

/**
 * Returns display badges for a person: team label and issue label.
 * 
 * Priority order for issues:
 * 1. Needs placement (team OR department missing)
 * 2. Needs manager (managerId or manager.name missing)
 * 3. Needs title (title and role missing)
 * 
 * @param source - Person data
 * @returns Object with teamLabel (if team exists) and issueLabel (if something is missing)
 */
export function getPersonDisplayBadges(source: PersonBadgeSource): {
  teamLabel?: string;
  issueLabel?: string;
} {
  // Extract team name (handle both string and object formats)
  const teamNameRaw = typeof source.team === "object" && source.team !== null
    ? source.team.name
    : source.team;
  const teamName = isValidValue(teamNameRaw) ? teamNameRaw : null;
  
  // Extract department name (handle both string and object formats)
  const departmentNameRaw = typeof source.department === "object" && source.department !== null
    ? source.department.name
    : source.department;
  const departmentName = isValidValue(departmentNameRaw) ? departmentNameRaw : null;
  
  // Check for manager (prefer managerId, fallback to manager.fullName or manager.name)
  const managerName = source.manager?.fullName || source.manager?.name;
  const hasManager = source.managerId || (managerName && isValidValue(managerName));
  
  // Check for title
  const hasTitle = (source.title && isValidValue(source.title)) || (source.role && isValidValue(source.role));
  
  // Determine issue label (priority order)
  let issueLabel: string | undefined;
  
  // 1. Needs placement (team OR department missing)
  if (!teamName && !departmentName) {
    issueLabel = "Needs placement";
  }
  // 2. Needs manager
  else if (!hasManager) {
    issueLabel = "Needs manager";
  }
  // 3. Needs title
  else if (!hasTitle) {
    issueLabel = "Needs title";
  }
  
  return {
    teamLabel: teamName || undefined,
    issueLabel,
  };
}


