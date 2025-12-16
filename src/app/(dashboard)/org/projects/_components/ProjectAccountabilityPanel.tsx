"use client";

import React from "react";
import Link from "next/link";
import { deriveProjectAccountability } from "@/lib/org/deriveProjectAccountability";
import { AccountabilityStatusPill } from "./AccountabilityStatusPill";

export function ProjectAccountabilityPanel({
  accountability,
  personNameMap,
}: {
  accountability?: {
    ownerPersonId?: string;
    ownerPerson?: string;
    ownerRole?: string;
    decisionPersonId?: string;
    decisionPerson?: string;
    decisionRole?: string;
    escalationPersonId?: string;
    escalationPerson?: string;
    escalationRole?: string;
    backupOwnerPersonId?: string;
    backupOwnerPerson?: string;
    backupOwnerRole?: string;
    backupDecisionPersonId?: string;
    backupDecisionPerson?: string;
    backupDecisionRole?: string;
  };
  personNameMap?: Map<string, string>;
}) {
  const readModel = deriveProjectAccountability(accountability);

  function getPersonName(personId: string, field: "owner" | "decision" | "escalation" | "backupOwner" | "backupDecision"): string | undefined {
    if (field === "owner") return accountability?.ownerPerson;
    if (field === "decision") return accountability?.decisionPerson;
    if (field === "escalation") return accountability?.escalationPerson;
    if (field === "backupOwner") return accountability?.backupOwnerPerson;
    if (field === "backupDecision") return accountability?.backupDecisionPerson;
    return undefined;
  }

  function renderFieldValue(value: typeof readModel.owner, field: "owner" | "decision" | "escalation" | "backupOwner" | "backupDecision"): string {
    if (value.type === "person") {
      const name = personNameMap?.get(value.personId) || getPersonName(value.personId, field);
      return name || "Person";
    }
    if (value.type === "role") {
      return value.role;
    }
    return "Not set";
  }

  return (
    <div className="space-y-3 rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-end -mt-1 -mr-1">
        <AccountabilityStatusPill status={readModel.status} missing={readModel.missing} />
      </div>

      <div>
        <div className="text-xs text-black/50 dark:text-white/50">Owner</div>
        <div className="text-sm">{renderFieldValue(readModel.owner, "owner")}</div>
        {readModel.owner.type === "role" && (
          <Link
            href="/org/roles"
            className="mt-1 block text-xs text-black/40 underline hover:text-black/60 dark:text-white/40 dark:hover:text-white/60"
          >
            View role responsibilities
          </Link>
        )}
      </div>

      <div>
        <div className="text-xs text-black/50 dark:text-white/50">Decision authority</div>
        <div className="text-sm">{renderFieldValue(readModel.decision, "decision")}</div>
        {readModel.decision.type === "role" && (
          <Link
            href="/org/roles"
            className="mt-1 block text-xs text-black/40 underline hover:text-black/60 dark:text-white/40 dark:hover:text-white/60"
          >
            View role responsibilities
          </Link>
        )}
      </div>

      <div>
        <div className="text-xs text-black/50 dark:text-white/50">Escalation</div>
        <div className="text-sm">{renderFieldValue(readModel.escalation, "escalation")}</div>
        {readModel.escalation.type === "role" && (
          <Link
            href="/org/roles"
            className="mt-1 block text-xs text-black/40 underline hover:text-black/60 dark:text-white/40 dark:hover:text-white/60"
          >
            View role responsibilities
          </Link>
        )}
      </div>

      {(readModel.backupOwner.type !== "unset" || readModel.backupDecision.type !== "unset") && (
        <div className="border-t border-black/10 pt-3 dark:border-white/10">
          <div className="mb-2 text-xs font-medium text-black/70 dark:text-white/70">Coverage</div>
          <div>
            <div className="text-xs text-black/50 dark:text-white/50">Backup owner</div>
            <div className="text-sm">{renderFieldValue(readModel.backupOwner, "backupOwner")}</div>
            {readModel.backupOwner.type === "role" && (
              <Link
                href="/org/roles"
                className="mt-1 block text-xs text-black/40 underline hover:text-black/60 dark:text-white/40 dark:hover:text-white/60"
              >
                View role responsibilities
              </Link>
            )}
          </div>
          <div className="mt-3">
            <div className="text-xs text-black/50 dark:text-white/50">Backup decision</div>
            <div className="text-sm">{renderFieldValue(readModel.backupDecision, "backupDecision")}</div>
            {readModel.backupDecision.type === "role" && (
              <Link
                href="/org/roles"
                className="mt-1 block text-xs text-black/40 underline hover:text-black/60 dark:text-white/40 dark:hover:text-white/60"
              >
                View role responsibilities
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

