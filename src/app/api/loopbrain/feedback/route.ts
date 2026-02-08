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
import {
  updateProfileFromFeedback,
  type ChatFeedback,
  type FeedbackRating,
  type FeedbackSignal,
} from "@/lib/loopbrain/personalization/profile";

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

    const workspaceId = auth.workspaceId;
    const userId = auth.user.userId;

    const body = (await req.json()) as {
      messageId?: string;
      rating?: string;
      signal?: string;
      comment?: string;
    };

    // Validate rating
    const rating = body.rating as FeedbackRating | undefined;
    if (!rating || !VALID_RATINGS.includes(rating)) {
      return NextResponse.json(
        { ok: false, error: "Invalid or missing 'rating'. Must be 'up' or 'down'." },
        { status: 400 },
      );
    }

    // Validate signal (optional)
    const signal = (body.signal as FeedbackSignal | undefined) || undefined;
    if (signal && !VALID_SIGNALS.includes(signal)) {
      return NextResponse.json(
        { ok: false, error: `Invalid 'signal'. Must be one of: ${VALID_SIGNALS.join(", ")}` },
        { status: 400 },
      );
    }

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
  } catch (error) {
    console.error("[loopbrain/feedback] Failed to process feedback", error);
    return NextResponse.json(
      { ok: false, error: "Failed to process feedback." },
      { status: 500 },
    );
  }
}
