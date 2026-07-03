import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto";

import { isPricingPlanKey, pricingPlanKeys, pricingPlans, type PricingPlanKey } from "./pricing";

const CREEM_TEST_API_BASE_URL = "https://test-api.creem.io";
const CREEM_PRODUCTION_API_BASE_URL = "https://api.creem.io";

type JsonRecord = Record<string, unknown>;

export type CreemCheckoutMetadata = {
  source: "dancegen";
  priceKey: PricingPlanKey;
  taskId?: string;
  userId: string;
};

export type CreateCreemCheckoutInput = {
  priceKey: PricingPlanKey;
  taskId?: string;
  userId: string;
  customerEmail?: string;
  origin?: string;
};

export type CreemCheckoutSession = {
  id: string;
  checkoutUrl: string;
  productId: string;
  requestId: string;
  metadata: CreemCheckoutMetadata;
};

export type CreemWebhookEvent = {
  id?: string;
  eventType?: string;
  type?: string;
  object?: unknown;
  created_at?: string | number;
  [key: string]: unknown;
};

export type CreemReturnVerification = {
  ok: boolean;
  reason?: string;
  params: Record<string, string>;
};

export class CreemConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreemConfigError";
  }
}

export class CreemApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`Creem API request failed with ${status}`);
    this.name = "CreemApiError";
    this.status = status;
    this.body = body;
  }
}

export function getCreemApiBaseUrl() {
  const configuredBaseUrl = process.env.CREEM_BASE_URL?.trim();
  const baseUrl = configuredBaseUrl || (process.env.NODE_ENV === "production" ? CREEM_PRODUCTION_API_BASE_URL : CREEM_TEST_API_BASE_URL);

  return baseUrl.replace(/\/+$/, "");
}

export function getCreemWebhookSecret() {
  return requireEnv("CREEM_WEBHOOK_SECRET");
}

export function getCreemApiKey() {
  return requireEnv("CREEM_API_KEY");
}

export function getCreemProductId(priceKey: PricingPlanKey) {
  const envNames = creemProductEnvNamesByPriceKey[priceKey];
  const productId = getFirstOptionalCreemEnv(envNames);

  if (!productId) {
    throw new CreemConfigError(`Missing ${envNames[0]} for ${priceKey}. Creem checkout sessions require a product_id.`);
  }

  return productId;
}

export function getPriceKeyForCreemProduct(productId: string | null | undefined): PricingPlanKey | null {
  if (!productId) {
    return null;
  }

  for (const priceKey of pricingPlanKeys) {
    if (getFirstOptionalCreemEnv(creemProductEnvNamesByPriceKey[priceKey]) === productId) {
      return priceKey;
    }
  }

  return null;
}

const creemProductEnvNamesByPriceKey: Record<PricingPlanKey, readonly string[]> = {
  [pricingPlans.singleUnlock.key]: ["CREEM_SINGLE_UNLOCK_PRODUCT_ID", "CREEM_SINGLE_UNLOCK_PRICE_ID"],
  [pricingPlans.starterMonthly.key]: ["CREEM_STARTER_MONTHLY_PRODUCT_ID"],
  [pricingPlans.starterAnnual.key]: ["CREEM_STARTER_ANNUAL_PRODUCT_ID"],
  [pricingPlans.creatorMonthly.key]: ["CREEM_CREATOR_MONTHLY_PRODUCT_ID", "CREEM_CREATOR_MONTHLY_PRICE_ID"],
  [pricingPlans.creatorAnnual.key]: ["CREEM_CREATOR_ANNUAL_PRODUCT_ID"],
  [pricingPlans.proMonthly.key]: ["CREEM_PRO_MONTHLY_PRODUCT_ID"],
  [pricingPlans.proAnnual.key]: ["CREEM_PRO_ANNUAL_PRODUCT_ID"],
};

export function getAppOrigin(requestUrl?: string) {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.BETTER_AUTH_URL?.trim();

  if (configuredAppUrl) {
    return configuredAppUrl.replace(/\/+$/, "");
  }

  if (requestUrl) {
    return new URL(requestUrl).origin;
  }

  return "http://localhost:3000";
}

export function getCreemReturnUrl(origin?: string) {
  return new URL("/api/payments/creem/return", origin || getAppOrigin()).toString();
}

export async function createCreemCheckoutSession(input: CreateCreemCheckoutInput): Promise<CreemCheckoutSession> {
  const productId = getCreemProductId(input.priceKey);
  const requestId = createCheckoutRequestId(input.priceKey, input.taskId);
  const metadata: CreemCheckoutMetadata = {
    source: "dancegen",
    priceKey: input.priceKey,
    userId: input.userId,
    ...(input.taskId ? { taskId: input.taskId } : {}),
  };
  const body = {
    product_id: productId,
    request_id: requestId,
    success_url: getCreemReturnUrl(input.origin),
    metadata,
    ...(input.customerEmail ? { customer: { email: input.customerEmail } } : {}),
  };

  const response = await fetch(`${getCreemApiBaseUrl()}/v1/checkouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getCreemApiKey(),
    },
    body: JSON.stringify(body),
  });
  const responseBody = await response.text();

  if (!response.ok) {
    throw new CreemApiError(response.status, responseBody);
  }

  const payload = parseJsonRecord(responseBody);
  const checkoutUrl = getString(payload, "checkout_url") || getString(payload, "checkoutUrl");
  const checkoutId = getString(payload, "id");

  if (!checkoutUrl || !checkoutId) {
    throw new CreemApiError(response.status, responseBody || "Creem response did not include id and checkout_url.");
  }

  return {
    id: checkoutId,
    checkoutUrl,
    productId,
    requestId,
    metadata,
  };
}

export function parseCreemWebhookEvent(rawBody: string): CreemWebhookEvent | null {
  const parsed = parseJsonRecord(rawBody);

  if (!parsed) {
    return null;
  }

  return parsed as CreemWebhookEvent;
}

export function getCreemWebhookEventType(event: CreemWebhookEvent) {
  return event.eventType || event.type || "unknown";
}

export function getCreemWebhookEventId(event: CreemWebhookEvent) {
  const objectId = getObjectId(event.object);
  const eventType = getCreemWebhookEventType(event);

  return event.id || [eventType, objectId, event.created_at].filter(Boolean).join(":") || `evt_${createHash("sha256").update(JSON.stringify(event)).digest("hex")}`;
}

export function verifyCreemWebhookSignature(rawBody: string, signatureHeader: string | null, webhookSecret = getCreemWebhookSecret()) {
  if (!signatureHeader) {
    return false;
  }

  const expectedSignature = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

  return timingSafeHexEqual(signatureHeader.trim(), expectedSignature);
}

export function verifyCreemReturnSignature(url: URL, apiKey = getCreemApiKey()): CreemReturnVerification {
  const params = Array.from(url.searchParams.entries());
  const signature = url.searchParams.get("signature");
  const publicParams = Object.fromEntries(params.filter(([key]) => key !== "signature"));

  if (!signature) {
    return { ok: false, reason: "missing_signature", params: publicParams };
  }

  const canonical = params
    .filter(([key, value]) => key !== "signature" && value !== "")
    .map(([key, value]) => `${key}=${value}`)
    .concat(`salt=${apiKey}`)
    .join("|");
  const expectedSignature = createHash("sha256").update(canonical).digest("hex");

  return {
    ok: timingSafeHexEqual(signature, expectedSignature),
    reason: timingSafeHexEqual(signature, expectedSignature) ? undefined : "invalid_signature",
    params: publicParams,
  };
}

export function parseCreemMetadata(value: unknown): CreemCheckoutMetadata | null {
  if (!isJsonRecord(value) || value.source !== "dancegen" || !isPricingPlanKey(value.priceKey) || typeof value.userId !== "string") {
    return null;
  }

  return {
    source: "dancegen",
    priceKey: value.priceKey,
    userId: value.userId,
    ...(typeof value.taskId === "string" ? { taskId: value.taskId } : {}),
  };
}

function createCheckoutRequestId(priceKey: PricingPlanKey, taskId?: string) {
  return ["dancegen", priceKey, taskId || "direct", randomUUID()].join(":");
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new CreemConfigError(`Missing ${name}.`);
  }

  return value;
}

function getOptionalCreemEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value || value.toUpperCase().startsWith("TODO")) {
    return "";
  }

  return value;
}

function getFirstOptionalCreemEnv(names: readonly string[]) {
  for (const name of names) {
    const value = getOptionalCreemEnv(name);

    if (value) {
      return value;
    }
  }

  return "";
}

function getString(payload: JsonRecord | null, key: string) {
  const value = payload?.[key];

  return typeof value === "string" ? value : null;
}

function getObjectId(value: unknown) {
  if (!isJsonRecord(value)) {
    return null;
  }

  return typeof value.id === "string" ? value.id : null;
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

function timingSafeHexEqual(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}
