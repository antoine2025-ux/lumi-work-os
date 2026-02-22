import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

type OrgQnaLogInput = {
  workspaceId: string;
  question: string;
  location?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Log a single Org Q&A request.
 * Best effort: failures should NOT block main flow.
 */
export async function logOrgQna(input: OrgQnaLogInput): Promise<void> {
  try {
    await prisma.orgQnaLog.create({
      data: {
        workspaceId: input.workspaceId,
        question: input.question,
        location: input.location ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.error("Failed to log org Q&A", error);
  }
}

