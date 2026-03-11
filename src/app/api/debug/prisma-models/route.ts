import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const isDev = process.env.NODE_ENV !== "production";
  if (!isDev) {
    return NextResponse.json({ error: "Not available in production." }, { status: 404 });
  }

  // @ts-expect-error — Prisma internal _dmmf API, no public type
  const dmmf = prisma?._dmmf;
  const modelMap = dmmf?.modelMap ?? null;

  if (!modelMap) {
    return NextResponse.json(
      { error: "Prisma DMMF not available on this client instance." },
      { status: 500 }
    );
  }

  const models = Object.entries<any>(modelMap).map(([name, model]) => {
    const fields = (model.fields ?? []).map((f: any) => ({
      name: f.name,
      kind: f.kind,
      type: f.type,
      isList: !!f.isList,
      isRequired: !!f.isRequired,
      relationName: f.relationName ?? null,
    }));

    return { name, fields };
  });

  // Also include a quick guess list for anything "owner/assign" related
  const ownershipCandidates = models
    .filter((m) => {
      const names = m.fields.map((f: any) => f.name.toLowerCase());
      return (
        names.some((n: string) => n.includes("owner")) ||
        names.some((n: string) => n.includes("assign")) ||
        names.some((n: string) => n.includes("respons"))
      );
    })
    .map((m) => ({
      name: m.name,
      fields: m.fields.map((f: any) => f.name),
    }));

  return NextResponse.json({
    modelsCount: models.length,
    models,
    ownershipCandidates,
  });
}

