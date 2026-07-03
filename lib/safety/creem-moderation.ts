import { CreemConfigError, getCreemApiBaseUrl, getCreemApiKey } from "../payments/creem";
import { getCreemModerationDecision, type CreemModerationDecision } from "./creem-moderation-decision";

const MODERATION_TIMEOUT_MS = 5_000;

type JsonRecord = Record<string, unknown>;

type ModeratePromptInput = {
  externalId: string;
  fetcher?: typeof fetch;
  prompt: string;
};

export class CreemModerationError extends Error {
  readonly kind: "blocked" | "unavailable";
  readonly decision?: CreemModerationDecision;
  readonly status?: number;

  constructor({
    decision,
    kind,
    message,
    status,
  }: {
    decision?: CreemModerationDecision;
    kind: "blocked" | "unavailable";
    message: string;
    status?: number;
  }) {
    super(message);
    this.name = "CreemModerationError";
    this.kind = kind;
    this.decision = decision;
    this.status = status;
  }
}

export async function assertPromptAllowedByCreemModeration({
  externalId,
  fetcher = fetch,
  prompt,
}: ModeratePromptInput) {
  const promptText = prompt.trim();

  if (!promptText) {
    throw createUnavailableModerationError("Moderation prompt is empty.");
  }

  let apiKey: string;

  try {
    apiKey = getCreemApiKey();
  } catch (error) {
    const message = error instanceof CreemConfigError ? error.message : "Creem moderation is not configured.";

    throw createUnavailableModerationError(message);
  }

  let response: Response;

  try {
    response = await fetcher(`${getCreemApiBaseUrl()}/v1/moderation/prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        prompt: promptText,
        external_id: externalId,
      }),
      signal: AbortSignal.timeout(MODERATION_TIMEOUT_MS),
    });
  } catch {
    throw createUnavailableModerationError("Creem moderation could not be reached.");
  }

  const responseBody = await response.text().catch(() => "");

  if (!response.ok) {
    throw createUnavailableModerationError("Creem moderation returned an unsuccessful response.", response.status);
  }

  const decision = getCreemModerationDecision(parseJsonRecord(responseBody));

  if (decision === "allow") {
    return;
  }

  if (decision === "flag" || decision === "deny") {
    throw new CreemModerationError({
      decision,
      kind: "blocked",
      message: "The generation request was blocked by Creem moderation.",
    });
  }

  throw createUnavailableModerationError("Creem moderation returned an unknown decision.");
}

function createUnavailableModerationError(message: string, status?: number) {
  return new CreemModerationError({
    kind: "unavailable",
    message,
    status,
  });
}

function parseJsonRecord(raw: string) {
  try {
    const parsed: unknown = JSON.parse(raw);

    return isJsonRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
