import { prisma } from "@/lib/db";

/**
 * We avoid hardcoding owner assignment field names.
 * This probes the Prisma model fields so we can map to what exists.
 */
export function getOwnerAssignmentModel() {
  // Prisma exposes DMMF on the client; use it to inspect models/fields.
  const dmmf = (prisma as any)._dmmf;
  if (!dmmf?.modelMap) return null;

  // Common model names
  const candidates = ["OwnerAssignment", "OwnershipAssignment", "OrgOwnerAssignment"];
  for (const name of candidates) {
    if (dmmf.modelMap[name]) {
      const fields = dmmf.modelMap[name].fields?.map((f: any) => f.name) ?? [];
      return { name, fields };
    }
  }

  // Fallback: find something that looks like owner assignment
  for (const [name, model] of Object.entries<any>(dmmf.modelMap)) {
    const fields = model.fields?.map((f: any) => f.name) ?? [];
    const looksLikeOwner =
      fields.some((f: string) => f.toLowerCase().includes("owner")) ||
      fields.some((f: string) => f.toLowerCase().includes("assignee"));
    const looksLikeTarget =
      fields.some((f: string) => f.toLowerCase().includes("department")) ||
      fields.some((f: string) => f.toLowerCase().includes("entity")) ||
      fields.some((f: string) => f.toLowerCase().includes("target")) ||
      fields.some((f: string) => f.toLowerCase().includes("resource"));

    if (looksLikeOwner && looksLikeTarget) {
      return { name, fields };
    }
  }

  return null;
}

export function pickFirstField(fields: string[], options: string[]) {
  for (const opt of options) {
    if (fields.includes(opt)) return opt;
  }
  return null;
}

