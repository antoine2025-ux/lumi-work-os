// Canonical ID helpers for Org entities in the Loopbrain context layer

export function orgId(): string {
  return "org";
}

export function departmentId(departmentDbId: string): string {
  return `department:${departmentDbId}`;
}

export function teamId(teamDbId: string): string {
  return `team:${teamDbId}`;
}

export function roleId(positionDbId: string): string {
  return `role:${positionDbId}`;
}

export function personId(userId: string): string {
  return `person:${userId}`;
}

