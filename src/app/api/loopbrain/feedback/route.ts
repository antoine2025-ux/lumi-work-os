/**
 * POST /api/loopbrain/feedback
 *
 * Chat-level feedback endpoint for Loopbrain responses.
 * Stores feedback in LoopBrainFeedback and adjusts the user's
 * LoopbrainUserProfile (personalization).
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

type FeedbackRequestBody = {
  messageId?: string;
  rating: FeedbackRating;
  signal?: FeedbackSignal;
  comment?: string;
};

const VALID_RATINGS: FeedbackRating[] = ["up", "down"];
const VALID_SIGNALS: FeedbackSignal[] = [
  "too_long",
  "too_short",
  "wrong_tone",
  "good",
];

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

    const body = (await req.json()) as FeedbackRequestBody;

    // Validate rating
    if (!body.rating || !VALID_RATINGS.includes(body.rating)) {
      return NextResponse.json(
        { ok: false, error: "Invalid or missing 'rating'. Must be 'up' or 'down'." },
        { status: 400 },
      );
    }

    // Validate signal (optional)
    if (body.signal && !VALID_SIGNALS.includes(body.signal)) {
      return NextResponse.json(
        { ok: false, error: `Invalid 'signal'. Must be one of: ${VALID_SIGNALS.join(", ")}` },
        { status: 400 },
      );
    }

    // 1) Store feedback record
    // Re-use LoopBrainFeedback with scope "chat" and orgId = workspaceId (workspace fallback)
    await prisma.loopBrainFeedback.create({
      data: {
        orgId: workspaceId,
        scope: "chat",
        feedback: JSON.stringify({
          messageId: body.messageId,
          rating: body.rating,
          signal: body.signal,
          comment: body.comment,
        }),
        accepted: body.rating === "up",
      },
    });

    // 2) Adjust user profile
    const chatFeedback: ChatFeedback = {
      rating: body.rating,
      signal: body.signal,
      comment: body.comment,
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
