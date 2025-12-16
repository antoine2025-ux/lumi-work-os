export type AccountabilityValue =
  | { type: "person"; personId: string }
  | { type: "role"; role: string }
  | { type: "unset" };

export type ProjectAccountabilityReadModel = {
  owner: AccountabilityValue;
  decision: AccountabilityValue;
  escalation: AccountabilityValue;
  backupOwner: AccountabilityValue;
  backupDecision: AccountabilityValue;
  status: "complete" | "incomplete";
  missing: Array<"owner" | "decision">;
};

function toValue(personId?: string | null, role?: string | null): AccountabilityValue {
  if (personId) return { type: "person", personId };
  if (role) return { type: "role", role };
  return { type: "unset" };
}

export function deriveProjectAccountability(a?: {
  ownerPersonId?: string | null;
  ownerRole?: string | null;
  decisionPersonId?: string | null;
  decisionRole?: string | null;
  escalationPersonId?: string | null;
  escalationRole?: string | null;
  backupOwnerPersonId?: string | null;
  backupOwnerRole?: string | null;
  backupDecisionPersonId?: string | null;
  backupDecisionRole?: string | null;
}): ProjectAccountabilityReadModel {
  const owner = toValue(a?.ownerPersonId, a?.ownerRole);
  const decision = toValue(a?.decisionPersonId, a?.decisionRole);
  const escalation = toValue(a?.escalationPersonId, a?.escalationRole);
  const backupOwner = toValue(a?.backupOwnerPersonId, a?.backupOwnerRole);
  const backupDecision = toValue(a?.backupDecisionPersonId, a?.backupDecisionRole);

  const missing: Array<"owner" | "decision"> = [];
  if (owner.type === "unset") missing.push("owner");
  if (decision.type === "unset") missing.push("decision");

  return {
    owner,
    decision,
    escalation,
    backupOwner,
    backupDecision,
    status: missing.length === 0 ? "complete" : "incomplete",
    missing,
  };
}

