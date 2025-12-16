export type AccountabilityTarget = {
  owner?: { type: "person" | "role"; value: string };
  decision?: { type: "person" | "role"; value: string };
  escalation?: { type: "person" | "role"; value: string };
};

export function isAccountabilityComplete(a?: AccountabilityTarget) {
  if (!a) return false;
  return !!a.owner && !!a.decision;
}

export function hasOwner(a?: AccountabilityTarget) {
  return !!a?.owner;
}

