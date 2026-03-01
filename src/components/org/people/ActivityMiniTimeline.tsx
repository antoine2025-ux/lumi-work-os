"use client";

import { Calendar } from "lucide-react";
import type { OrgPerson } from "@/types/org";

type ActivityMiniTimelineProps = {
  person: OrgPerson;
};

type ActivityItem = {
  id: string;
  action: string;
  date: string;
};

/**
 * Derives activity from person data
 * TODO [BACKLOG]: Use OrgAuditLog change history when populated
 */
function deriveActivity(person: OrgPerson): ActivityItem[] {
  const activities: ActivityItem[] = [];

  // Joined the company
  if (person.joinedAt) {
    activities.push({
      id: "joined",
      action: "Joined the company",
      date: person.joinedAt,
    });
  }

  // TODO [BACKLOG]: Add role/team change activities from OrgAuditLog
  // - "Moved to Platform team"
  // - "Promoted to Senior Engineer"
  // etc.

  // Sort by date (newest first) and limit to 3
  return activities
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);
}

/**
 * Activity mini timeline component
 * Shows last 3 activities or a message if none available
 */
export function ActivityMiniTimeline({ person }: ActivityMiniTimelineProps) {
  const activities = deriveActivity(person);

  if (activities.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Activity
        </h3>
        <p className="text-sm text-slate-400 italic">
          No recent activity recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Activity
      </h3>
      <div className="space-y-2.5">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-800/30"
          >
            <div className="mt-0.5 shrink-0">
              <Calendar className="h-4 w-4 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200">{activity.action}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(activity.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

