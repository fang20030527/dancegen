export type CreemModerationDecision = "allow" | "flag" | "deny";

type JsonRecord = Record<string, unknown>;

export function getCreemModerationDecision(payload: unknown): CreemModerationDecision | null {
  if (!isJsonRecord(payload)) {
    return null;
  }

  const decision = payload.decision;

  return decision === "allow" || decision === "flag" || decision === "deny" ? decision : null;
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
