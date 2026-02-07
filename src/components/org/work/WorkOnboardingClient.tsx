"use client";

/**
 * O1: Intent-Driven Onboarding - Simplified Work Question Form
 *
 * "What do you want to work on?" — lets users ask a real work question
 * before configuring any Org entities. Creates a provisional WorkRequest.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrgPrimaryCta } from "@/components/org/ui/OrgCtaButton";
import { Loader2 } from "lucide-react";

const TITLE_MAX_LENGTH = 200;

export function WorkOnboardingClient() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [requiredRole, setRequiredRole] = useState("");
  const [weeklyHours, setWeeklyHours] = useState<number>(20);
  const [desiredStart, setDesiredStart] = useState("");
  const [desiredEnd, setDesiredEnd] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    title.trim().length > 0 &&
    title.trim().length <= TITLE_MAX_LENGTH &&
    requiredRole.trim().length > 0 &&
    weeklyHours > 0 &&
    Number.isInteger(weeklyHours);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isValid || submitting) return;

      setSubmitting(true);
      setError(null);

      try {
        const body: Record<string, unknown> = {
          provisional: true,
          title: title.trim(),
          requiredRoleType: requiredRole.trim(),
          effortHours: weeklyHours,
        };

        if (desiredStart) body.desiredStart = new Date(desiredStart).toISOString();
        if (desiredEnd) body.desiredEnd = new Date(desiredEnd).toISOString();

        const res = await fetch("/api/org/work/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Something went wrong");
          return;
        }

        router.push(`/org/work/${data.request.id}`);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [isValid, submitting, title, requiredRole, weeklyHours, desiredStart, desiredEnd, router]
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#020617] px-4">
      <Card className="w-full max-w-lg border-slate-800 bg-slate-950/60">
        <CardHeader className="space-y-2">
          <CardTitle className="text-lg font-semibold text-slate-50">
            What do you want to work on?
          </CardTitle>
          <CardDescription className="text-[12px] text-slate-400">
            Describe the work and we&apos;ll tell you if your team can handle it.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-[12px] text-slate-300">
                Title
              </Label>
              <Input
                id="title"
                placeholder="e.g. Redesign checkout flow"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX_LENGTH))}
                maxLength={TITLE_MAX_LENGTH}
                required
                className="border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-600"
              />
              {title.trim().length > 0 && title.trim().length > TITLE_MAX_LENGTH - 20 && (
                <p className="text-[10px] text-slate-500">
                  {title.trim().length}/{TITLE_MAX_LENGTH}
                </p>
              )}
            </div>

            {/* Required role */}
            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-[12px] text-slate-300">
                Required role
              </Label>
              <Input
                id="role"
                placeholder='e.g. "Engineer", "PM", "Designer"'
                value={requiredRole}
                onChange={(e) => setRequiredRole(e.target.value)}
                required
                className="border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-600"
              />
            </div>

            {/* Estimated weekly hours */}
            <div className="space-y-1.5">
              <Label htmlFor="hours" className="text-[12px] text-slate-300">
                Estimated weekly hours
              </Label>
              <Input
                id="hours"
                type="number"
                min={1}
                step={1}
                value={weeklyHours}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) setWeeklyHours(val);
                }}
                required
                className="border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-600"
              />
            </div>

            {/* Optional timeframe */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start" className="text-[10px] text-slate-500">
                  Start (optional)
                </Label>
                <Input
                  id="start"
                  type="date"
                  value={desiredStart}
                  onChange={(e) => setDesiredStart(e.target.value)}
                  className="border-slate-700 bg-slate-900 text-slate-100 text-[12px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end" className="text-[10px] text-slate-500">
                  End (optional)
                </Label>
                <Input
                  id="end"
                  type="date"
                  value={desiredEnd}
                  onChange={(e) => setDesiredEnd(e.target.value)}
                  className="border-slate-700 bg-slate-900 text-slate-100 text-[12px]"
                />
              </div>
            </div>

            {error && (
              <p className="text-[12px] text-red-400">{error}</p>
            )}

            <OrgPrimaryCta
              type="submit"
              className="w-full"
              disabled={!isValid || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Ask this question"
              )}
            </OrgPrimaryCta>

            <div className="text-center space-y-1">
              <Link
                href="/org?skipOnboarding=true"
                className="text-[11px] text-slate-500 hover:text-slate-400 transition-colors"
              >
                Skip for now
              </Link>
              <p className="text-[10px] text-slate-600">
                Skipping won&apos;t mark onboarding complete. You can return anytime.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
