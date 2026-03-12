/**
 * POST /api/loopbrain/feedback
 *
 * Chat-level feedback endpoint for Loopbrain responses.
 * Stores feedback in LoopbrainChatFeedback (workspace+user scoped)
 * and adjusts the user's LoopbrainUserProfile (personalization).
 *
 * Auth: getUnifiedAuth + assertAccess (workspace MEMBER+).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import {
  updateProfileFromFeedback,
  type ChatFeedback,
  type FeedbackRating,
  type FeedbackSignal,
} from "@/lib/loopbrain/personalization/profile";
import { LoopbrainFeedbackSchema } from "@/lib/validations/loopbrain";

export const dynamic = "force-dynamic";

const VALID_RATINGS: FeedbackRating[] = ["up", "down"];
const VALID_SIGNALS: FeedbackSignal[] = [
  "too_long",
  "too_short",
  "wrong_tone",
  "good",
];

const MAX_COMMENT_LENGTH = 500;
const MAX_MESSAGE_ID_LENGTH = 100;

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.workspaceId) {
      return NextResponse.json(
        { ok: false, error: "No workspace in session." },
        { status: 400 },
      );
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });
    setWorkspaceContext(auth.workspaceId);

    const workspaceId = auth.workspaceId;
    const userId = auth.user.userId;

    const body = LoopbrainFeedbackSchema.parse(await req.json());
    const rating = body.rating as FeedbackRating;
    const signal = body.signal as FeedbackSignal | undefined;

    // Sanitize string inputs
    const messageId = body.messageId
      ? String(body.messageId).slice(0, MAX_MESSAGE_ID_LENGTH)
      : undefined;
    const notes = body.comment
      ? String(body.comment).slice(0, MAX_COMMENT_LENGTH)
      : undefined;

    // 1) Store feedback record in the dedicated chat feedback table
    await prisma.loopbrainChatFeedback.create({
      data: {
        workspaceId,
        userId,
        scope: "chat",
        rating,
        signal: signal ?? null,
        messageId: messageId ?? null,
        notes: notes ?? null,
      },
    });

    // 2) Adjust user profile
    const chatFeedback: ChatFeedback = {
      rating,
      signal,
      comment: notes,
    };
    const updatedProfile = await updateProfileFromFeedback(
      workspaceId,
      userId,
      chatFeedback,
    );

    return NextResponse.json({
      ok: true,
      profile: {
        tone: updatedProfile.tone,
        verbosity: updatedProfile.verbosity,
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, req);
  }
}
