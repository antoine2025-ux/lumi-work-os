import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export type OrgLoopbrainQueryLogInput = {
  workspaceId: string;
  userId?: string | null;
  question: string;
  answerPreview: string;
  contextItemsCount: number;
  metadata?: Record<string, unknown>;
};

/**
 * Lightweight logger for Org → Loopbrain questions.
 * Fire-and-forget; failures should not break user flows.
 */
export async function logOrgLoopbrainQuery(
  input: OrgLoopbrainQueryLogInput
): Promise<void> {
  const {
    workspaceId,
    userId = null,
    question,
    answerPreview,
    contextItemsCount,
    metadata,
  } = input;

  try {
    await prisma.orgLoopbrainQueryLog.create({
      data: {
        workspaceId,
        userId: userId ?? null,
        question,
        answerPreview,
        contextItemsCount,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    // Intentionally swallow errors – logging must never block answers.
    console.error("[OrgLoopbrainQueryLog] Failed to log Org Loopbrain query", error);
  }
}

/**
 * Utility to create a safe preview (trim to N chars, no newlines).
 */
export function createAnswerPreview(answer: string, maxLength = 280): string {
  if (!answer) return "";
  const trimmed = answer.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength) + "…";
}

