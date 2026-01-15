export type DisplayablePerson = {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

export function personDisplayName(p?: DisplayablePerson | null): string | null {
  if (!p) return null;
  const full = p.fullName?.trim();
  if (full) return full;

  const composed = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
  if (composed) return composed;

  const email = p.email?.trim();
  if (email) return email;

  return "Unnamed";
}

