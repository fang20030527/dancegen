import { Pool } from "@neondatabase/serverless";

import {
  getCreemWebhookEventId,
  getCreemWebhookEventType,
  getPriceKeyForCreemProduct,
  parseCreemMetadata,
  type CreemCheckoutSession,
  type CreemWebhookEvent,
} from "@/lib/payments/creem";
import { pricingPlans, type PricingPlanKey } from "@/lib/payments/pricing";

type JsonRecord = Record<string, unknown>;

type EntitlementState = {
  id: string;
  action: string;
  status: string;
  userId: string;
  planKey: PricingPlanKey;
  taskId: string | null;
  creemCustomerId: string | null;
  creemCheckoutId: string | null;
  creemOrderId: string | null;
  creemSubscriptionId: string | null;
  creemProductId: string | null;
  creemTransactionId: string | null;
  validFrom: string | null;
  validUntil: string | null;
  metadata: JsonRecord;
};

export type ApplyCreemWebhookResult = {
  stored: boolean;
  processed: boolean;
  alreadyProcessed: boolean;
  eventId: string;
  eventType: string;
  actions: string[];
  message?: string;
};

let pool: Pool | null | undefined;
let schemaReady = false;

export async function recordPendingCreemCheckout(session: CreemCheckoutSession) {
  const database = getPaymentPool();

  if (!database) {
    return { stored: false, message: "DATABASE_URL is not configured." };
  }

  await ensurePaymentTables(database);

  const state: EntitlementState = {
    id: buildEntitlementId({
      planKey: session.metadata.priceKey,
      taskId: session.metadata.taskId || null,
      checkoutId: session.id,
      subscriptionId: null,
      orderId: null,
    }),
    action: "checkout_created",
    status: "pending",
    userId: session.metadata.userId,
    planKey: session.metadata.priceKey,
    taskId: session.metadata.taskId || null,
    creemCustomerId: null,
    creemCheckoutId: session.id,
    creemOrderId: null,
    creemSubscriptionId: null,
    creemProductId: session.productId,
    creemTransactionId: null,
    validFrom: null,
    validUntil: null,
    metadata: {
      ...session.metadata,
      requestId: session.requestId,
    },
  };

  await upsertEntitlement(database, state, `checkout:${session.id}`);
  await insertLedgerEntry(database, state, `checkout:${session.id}`);

  return { stored: true };
}

export async function applyCreemWebhookEvent(event: CreemWebhookEvent): Promise<ApplyCreemWebhookResult> {
  const database = getPaymentPool();
  const eventType = getCreemWebhookEventType(event);
  const eventId = getCreemWebhookEventId(event);

  if (!database) {
    return {
      stored: false,
      processed: true,
      alreadyProcessed: false,
      eventId,
      eventType,
      actions: [],
      message: "DATABASE_URL is not configured; webhook was verified but no entitlement ledger was written.",
    };
  }

  await ensurePaymentTables(database);

  const currentStatus = await recordWebhookAttempt(database, event, eventId, eventType);

  if (currentStatus === "processed") {
    return {
      stored: true,
      processed: true,
      alreadyProcessed: true,
      eventId,
      eventType,
      actions: [],
    };
  }

  try {
    const state = buildEntitlementStateFromEvent(event, eventType);

    if (!state) {
      await markWebhookProcessed(database, eventId);

      return {
        stored: true,
        processed: true,
        alreadyProcessed: false,
        eventId,
        eventType,
        actions: [],
        message: "Event was recorded but did not match a configured DanceGen product.",
      };
    }

    await upsertEntitlement(database, state, eventId);
    await insertLedgerEntry(database, state, eventId);
    await markWebhookProcessed(database, eventId);

    return {
      stored: true,
      processed: true,
      alreadyProcessed: false,
      eventId,
      eventType,
      actions: [state.action],
    };
  } catch (error) {
    await markWebhookFailed(database, eventId, error instanceof Error ? error.message : "Unknown webhook processing error.");
    throw error;
  }
}

function getPaymentPool() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (pool === undefined) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  return pool;
}

async function ensurePaymentTables(database: Pool) {
  if (schemaReady) {
    return;
  }

  await database.query(`
    CREATE TABLE IF NOT EXISTS payment_webhook_events (
      id text PRIMARY KEY,
      event_type text NOT NULL,
      object_id text,
      status text NOT NULL DEFAULT 'processing',
      attempts integer NOT NULL DEFAULT 1,
      payload jsonb NOT NULL,
      last_error text,
      received_at timestamptz NOT NULL DEFAULT now(),
      processed_at timestamptz
    )
  `);

  await database.query(`
    CREATE TABLE IF NOT EXISTS payment_entitlements (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      plan_key text NOT NULL,
      status text NOT NULL,
      task_id text,
      creem_customer_id text,
      creem_checkout_id text,
      creem_order_id text,
      creem_subscription_id text,
      creem_product_id text,
      creem_transaction_id text,
      valid_from timestamptz,
      valid_until timestamptz,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      updated_by_event_id text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await database.query(`
    CREATE TABLE IF NOT EXISTS payment_entitlement_ledger (
      id text PRIMARY KEY,
      event_id text NOT NULL,
      entitlement_id text NOT NULL,
      action text NOT NULL,
      status text NOT NULL,
      user_id text NOT NULL,
      plan_key text NOT NULL,
      task_id text,
      creem_customer_id text,
      creem_checkout_id text,
      creem_order_id text,
      creem_subscription_id text,
      creem_product_id text,
      creem_transaction_id text,
      valid_from timestamptz,
      valid_until timestamptz,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  schemaReady = true;
}

async function recordWebhookAttempt(database: Pool, event: CreemWebhookEvent, eventId: string, eventType: string) {
  const result = await database.query(
    `
      INSERT INTO payment_webhook_events (id, event_type, object_id, payload)
      VALUES ($1, $2, $3, $4::jsonb)
      ON CONFLICT (id) DO UPDATE
      SET attempts = payment_webhook_events.attempts + 1,
          payload = EXCLUDED.payload,
          received_at = now()
      RETURNING status
    `,
    [eventId, eventType, getObjectStringId(event.object), JSON.stringify(event)],
  );
  const row = result.rows[0] as { status?: string } | undefined;

  return row?.status;
}

async function markWebhookProcessed(database: Pool, eventId: string) {
  await database.query(
    `
      UPDATE payment_webhook_events
      SET status = 'processed',
          last_error = null,
          processed_at = now()
      WHERE id = $1
    `,
    [eventId],
  );
}

async function markWebhookFailed(database: Pool, eventId: string, message: string) {
  await database.query(
    `
      UPDATE payment_webhook_events
      SET status = 'failed',
          last_error = $2
      WHERE id = $1
    `,
    [eventId, message],
  );
}

async function upsertEntitlement(database: Pool, state: EntitlementState, eventId: string) {
  await database.query(
    `
      INSERT INTO payment_entitlements (
        id,
        user_id,
        plan_key,
        status,
        task_id,
        creem_customer_id,
        creem_checkout_id,
        creem_order_id,
        creem_subscription_id,
        creem_product_id,
        creem_transaction_id,
        valid_from,
        valid_until,
        metadata,
        updated_by_event_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz, $13::timestamptz, $14::jsonb, $15)
      ON CONFLICT (id) DO UPDATE
      SET user_id = EXCLUDED.user_id,
          plan_key = EXCLUDED.plan_key,
          status = EXCLUDED.status,
          task_id = COALESCE(EXCLUDED.task_id, payment_entitlements.task_id),
          creem_customer_id = COALESCE(EXCLUDED.creem_customer_id, payment_entitlements.creem_customer_id),
          creem_checkout_id = COALESCE(EXCLUDED.creem_checkout_id, payment_entitlements.creem_checkout_id),
          creem_order_id = COALESCE(EXCLUDED.creem_order_id, payment_entitlements.creem_order_id),
          creem_subscription_id = COALESCE(EXCLUDED.creem_subscription_id, payment_entitlements.creem_subscription_id),
          creem_product_id = COALESCE(EXCLUDED.creem_product_id, payment_entitlements.creem_product_id),
          creem_transaction_id = COALESCE(EXCLUDED.creem_transaction_id, payment_entitlements.creem_transaction_id),
          valid_from = COALESCE(EXCLUDED.valid_from, payment_entitlements.valid_from),
          valid_until = EXCLUDED.valid_until,
          metadata = payment_entitlements.metadata || EXCLUDED.metadata,
          updated_by_event_id = EXCLUDED.updated_by_event_id,
          updated_at = now()
    `,
    getEntitlementValues(state, eventId),
  );
}

async function insertLedgerEntry(database: Pool, state: EntitlementState, eventId: string) {
  await database.query(
    `
      INSERT INTO payment_entitlement_ledger (
        id,
        event_id,
        entitlement_id,
        action,
        status,
        user_id,
        plan_key,
        task_id,
        creem_customer_id,
        creem_checkout_id,
        creem_order_id,
        creem_subscription_id,
        creem_product_id,
        creem_transaction_id,
        valid_from,
        valid_until,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::timestamptz, $16::timestamptz, $17::jsonb)
      ON CONFLICT (id) DO NOTHING
    `,
    [
      `${eventId}:${state.id}:${state.action}`,
      eventId,
      state.id,
      state.action,
      state.status,
      state.userId,
      state.planKey,
      state.taskId,
      state.creemCustomerId,
      state.creemCheckoutId,
      state.creemOrderId,
      state.creemSubscriptionId,
      state.creemProductId,
      state.creemTransactionId,
      state.validFrom,
      state.validUntil,
      JSON.stringify(state.metadata),
    ],
  );
}

function getEntitlementValues(state: EntitlementState, eventId: string) {
  return [
    state.id,
    state.userId,
    state.planKey,
    state.status,
    state.taskId,
    state.creemCustomerId,
    state.creemCheckoutId,
    state.creemOrderId,
    state.creemSubscriptionId,
    state.creemProductId,
    state.creemTransactionId,
    state.validFrom,
    state.validUntil,
    JSON.stringify(state.metadata),
    eventId,
  ];
}

function buildEntitlementStateFromEvent(event: CreemWebhookEvent, eventType: string): EntitlementState | null {
  const object = asRecord(event.object);

  if (!object) {
    return null;
  }

  const eventAction = getEventAction(eventType, object);

  if (!eventAction) {
    return null;
  }

  const metadata = getDancegenMetadata(object);
  const creemProductId = getProductId(object);
  const planKey = metadata?.priceKey || getPriceKeyForCreemProduct(creemProductId);

  if (!planKey) {
    return null;
  }

  const creemCheckoutId = getCheckoutId(object, eventType);
  const creemOrderId = getOrderId(object, eventType);
  const creemSubscriptionId = getSubscriptionId(object, eventType);
  const taskId = metadata?.taskId || null;

  return {
    id: buildEntitlementId({
      planKey,
      taskId,
      checkoutId: creemCheckoutId,
      subscriptionId: creemSubscriptionId,
      orderId: creemOrderId,
    }),
    action: eventAction.action,
    status: eventAction.status,
    userId: metadata?.userId || getString(object, "internal_customer_id") || "demo-user",
    planKey,
    taskId,
    creemCustomerId: getCustomerId(object),
    creemCheckoutId,
    creemOrderId,
    creemSubscriptionId,
    creemProductId,
    creemTransactionId: getTransactionId(object),
    validFrom: getString(object, "current_period_start_date") || getString(object, "created_at"),
    validUntil: eventAction.validUntilNow ? new Date().toISOString() : getString(object, "current_period_end_date"),
    metadata: {
      ...(metadata || {}),
      eventType,
      creemStatus: getString(object, "status"),
    },
  };
}

function getEventAction(eventType: string, object: JsonRecord) {
  if (eventType === "checkout.completed") {
    return { action: "grant_access", status: "active", validUntilNow: false };
  }

  if (eventType === "subscription.paid") {
    return { action: "renew_subscription", status: "active", validUntilNow: false };
  }

  if (eventType === "subscription.active" || eventType === "subscription.update" || eventType === "subscription.trialing") {
    return { action: "sync_subscription", status: getString(object, "status") || "active", validUntilNow: false };
  }

  if (eventType === "subscription.scheduled_cancel") {
    return { action: "schedule_cancel_subscription", status: "scheduled_cancel", validUntilNow: false };
  }

  if (eventType === "subscription.past_due") {
    return { action: "mark_subscription_past_due", status: "past_due", validUntilNow: false };
  }

  if (eventType === "subscription.paused") {
    return { action: "pause_subscription", status: "paused", validUntilNow: true };
  }

  if (eventType === "subscription.canceled" || eventType === "subscription.expired") {
    return { action: "revoke_subscription", status: eventType.replace("subscription.", ""), validUntilNow: true };
  }

  if (eventType === "refund.created") {
    return { action: "revoke_refunded_access", status: "refunded", validUntilNow: true };
  }

  if (eventType === "dispute.created") {
    return { action: "revoke_disputed_access", status: "disputed", validUntilNow: true };
  }

  return null;
}

function buildEntitlementId({
  planKey,
  taskId,
  checkoutId,
  subscriptionId,
  orderId,
}: {
  planKey: PricingPlanKey;
  taskId: string | null;
  checkoutId: string | null;
  subscriptionId: string | null;
  orderId: string | null;
}) {
  if (subscriptionId) {
    return `subscription:${subscriptionId}`;
  }

  if (planKey === pricingPlans.singleUnlock.key && taskId) {
    return `task:${taskId}:single_hd_unlock`;
  }

  return `checkout:${checkoutId || orderId || "unknown"}`;
}

function getDancegenMetadata(object: JsonRecord) {
  const candidates = [
    asRecord(object.metadata),
    asRecord(asRecord(object.checkout)?.metadata),
    asRecord(asRecord(object.subscription)?.metadata),
    asRecord(asRecord(object.order)?.metadata),
  ];

  for (const candidate of candidates) {
    const metadata = parseCreemMetadata(candidate);

    if (metadata) {
      return metadata;
    }
  }

  return null;
}

function getProductId(object: JsonRecord) {
  return (
    getObjectReferenceId(object.product) ||
    getObjectReferenceId(asRecord(object.order)?.product) ||
    getObjectReferenceId(asRecord(object.checkout)?.product) ||
    getObjectReferenceId(asRecord(object.subscription)?.product) ||
    null
  );
}

function getCustomerId(object: JsonRecord) {
  return (
    getObjectReferenceId(object.customer) ||
    getObjectReferenceId(asRecord(object.order)?.customer) ||
    getObjectReferenceId(asRecord(object.checkout)?.customer) ||
    getObjectReferenceId(asRecord(object.subscription)?.customer) ||
    null
  );
}

function getCheckoutId(object: JsonRecord, eventType: string) {
  if (eventType === "checkout.completed") {
    return getString(object, "id");
  }

  return getObjectReferenceId(object.checkout) || getString(object, "checkout_id") || null;
}

function getOrderId(object: JsonRecord, eventType: string) {
  if (getString(object, "object") === "order") {
    return getString(object, "id");
  }

  if (eventType === "checkout.completed") {
    return getObjectReferenceId(object.order);
  }

  return getObjectReferenceId(object.order) || getString(object, "order_id") || null;
}

function getSubscriptionId(object: JsonRecord, eventType: string) {
  if (eventType.startsWith("subscription.") || getString(object, "object") === "subscription") {
    return getString(object, "id");
  }

  return getObjectReferenceId(object.subscription) || getString(object, "subscription_id") || null;
}

function getTransactionId(object: JsonRecord) {
  return (
    getString(object, "last_transaction_id") ||
    getObjectReferenceId(object.transaction) ||
    getString(object, "transaction_id") ||
    getObjectReferenceId(asRecord(object.order)?.transaction) ||
    null
  );
}

function getObjectStringId(value: unknown) {
  return asRecord(value)?.id?.toString() || null;
}

function getObjectReferenceId(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  return getObjectStringId(value);
}

function getString(record: JsonRecord, key: string) {
  const value = record[key];

  return typeof value === "string" ? value : null;
}

function asRecord(value: unknown): JsonRecord | null {
  return Boolean(value && typeof value === "object" && !Array.isArray(value)) ? (value as JsonRecord) : null;
}
