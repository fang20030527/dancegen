import { createHash, randomUUID } from "node:crypto";

import { Pool } from "@neondatabase/serverless";

import type {
  CustomTemplateIngest,
  CustomTemplateMime,
  CustomTemplateState,
} from "./types";

type UsableIngest = {
  userId: string;
  state: CustomTemplateState;
  expiresAt: string | null;
  consumedAt: string | null;
};

export function hashCustomTemplateToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isOwnedUsableIngest(
  ingest: UsableIngest,
  userId: string,
  now: Date = new Date(),
): boolean {
  if (
    ingest.userId !== userId ||
    ingest.state !== "ready" ||
    ingest.consumedAt !== null ||
    ingest.expiresAt === null
  ) {
    return false;
  }

  const expiresAt = Date.parse(ingest.expiresAt);

  return Number.isFinite(expiresAt) && expiresAt > now.getTime();
}

const customTemplateAbandonmentMs = 60 * 60 * 1000;

type CleanupCandidateIngest = {
  state: CustomTemplateState;
  createdAt: string;
  expiresAt: string | null;
  deletedAt: string | null;
};

export function isCleanupCandidate(
  ingest: CleanupCandidateIngest,
  now: Date = new Date(),
): boolean {
  if (ingest.deletedAt !== null || ingest.state === "deleted") {
    return false;
  }

  if (["rejected", "failed", "consumed"].includes(ingest.state)) {
    return true;
  }

  if (["awaiting_upload", "transferring", "reviewing"].includes(ingest.state)) {
    const createdAt = Date.parse(ingest.createdAt);
    return Number.isFinite(createdAt) && createdAt <= now.getTime() - customTemplateAbandonmentMs;
  }

  if (ingest.state === "ready" || ingest.state === "reserved") {
    const expiresAt = ingest.expiresAt === null ? Number.NaN : Date.parse(ingest.expiresAt);
    return Number.isFinite(expiresAt) && expiresAt <= now.getTime();
  }

  return false;
}

export type CreateIngestInput = {
  userId: string;
  idempotencyKey: string;
  sourceKind: "upload" | "url";
  mimeType: CustomTemplateMime;
  sizeBytes: number;
};

export interface CustomTemplateRepository {
  createOrGet(input: CreateIngestInput): Promise<CustomTemplateIngest>;
  findOwned(id: string, userId: string): Promise<CustomTemplateIngest | null>;
  findByTokenHash(tokenHash: string): Promise<CustomTemplateIngest | null>;
  markReviewing(id: string, userId: string): Promise<CustomTemplateIngest>;
  markReady(input: {
    id: string;
    userId: string;
    durationSeconds: number;
    tokenHash: string;
    expiresAt: string;
  }): Promise<CustomTemplateIngest>;
  markFailed(input: {
    id: string;
    userId: string;
    state: "failed" | "rejected";
    reasonCode: string;
  }): Promise<CustomTemplateIngest>;
  reserve(id: string, userId: string): Promise<boolean>;
  releaseReservation(id: string, userId: string): Promise<boolean>;
  consume(id: string, userId: string, providerTaskId: string): Promise<boolean>;
  markDeleted(id: string, userId: string): Promise<void>;
  listCleanupCandidates(now: Date, limit: number): Promise<CustomTemplateIngest[]>;
}

type QueryResult<Row> = {
  rows: Row[];
  rowCount: number | null;
};

type Database = {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    queryText: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
};

type IngestRow = {
  id: string;
  user_id: string;
  idempotency_key: string;
  source_kind: "upload" | "url";
  object_key: string;
  mime_type: CustomTemplateMime;
  size_bytes: string | number;
  duration_seconds: string | number | null;
  state: CustomTemplateState;
  token_hash: string | null;
  reason_code: string | null;
  created_at: string | Date;
  approved_at: string | Date | null;
  expires_at: string | Date | null;
  consumed_at: string | Date | null;
  deleted_at: string | Date | null;
};

const ingestColumns = `
  id,
  user_id,
  idempotency_key,
  source_kind,
  object_key,
  mime_type,
  size_bytes,
  duration_seconds,
  state,
  token_hash,
  reason_code,
  created_at,
  approved_at,
  expires_at,
  consumed_at,
  deleted_at
`;

const validStates: readonly CustomTemplateState[] = [
  "awaiting_upload",
  "transferring",
  "reviewing",
  "ready",
  "reserved",
  "rejected",
  "failed",
  "consumed",
  "deleted",
];

export class CustomTemplateRepositoryError extends Error {
  readonly code: "NOT_FOUND" | "INVALID_STATE" | "IDEMPOTENCY_CONFLICT";

  constructor(
    code: "NOT_FOUND" | "INVALID_STATE" | "IDEMPOTENCY_CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "CustomTemplateRepositoryError";
    this.code = code;
  }
}

export class PostgresCustomTemplateRepository implements CustomTemplateRepository {
  private readonly database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  async createOrGet(input: CreateIngestInput): Promise<CustomTemplateIngest> {
    await ensureCustomTemplateSchema(this.database);

    const id = randomUUID();
    const objectKey = buildQuarantineObjectKey(input.userId, id);
    const initialState = input.sourceKind === "upload" ? "awaiting_upload" : "transferring";
    const result = await this.database.query<IngestRow>(
      `
        INSERT INTO custom_template_ingests (
          id, user_id, idempotency_key, source_kind, object_key, mime_type, size_bytes, state
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id, idempotency_key) DO UPDATE
        SET idempotency_key = EXCLUDED.idempotency_key
        RETURNING ${ingestColumns}
      `,
      [
        id,
        input.userId,
        input.idempotencyKey,
        input.sourceKind,
        objectKey,
        input.mimeType,
        input.sizeBytes,
        initialState,
      ],
    );
    const ingest = mapIngestRow(requireRow(result.rows[0]));

    assertIdempotentInputMatches(ingest, input);
    return ingest;
  }

  async findOwned(id: string, userId: string): Promise<CustomTemplateIngest | null> {
    await ensureCustomTemplateSchema(this.database);

    const result = await this.database.query<IngestRow>(
      `SELECT ${ingestColumns} FROM custom_template_ingests WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );

    return result.rows[0] ? mapIngestRow(result.rows[0]) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<CustomTemplateIngest | null> {
    await ensureCustomTemplateSchema(this.database);

    const result = await this.database.query<IngestRow>(
      `SELECT ${ingestColumns} FROM custom_template_ingests WHERE token_hash = $1`,
      [tokenHash],
    );

    return result.rows[0] ? mapIngestRow(result.rows[0]) : null;
  }

  async markReviewing(id: string, userId: string): Promise<CustomTemplateIngest> {
    const updated = await this.updateAndReturn(
      `
        UPDATE custom_template_ingests
        SET state = 'reviewing', reason_code = NULL, updated_at = now()
        WHERE id = $1 AND user_id = $2 AND state IN ('awaiting_upload', 'transferring')
        RETURNING ${ingestColumns}
      `,
      [id, userId],
    );

    return updated ?? this.requireExistingState(id, userId, ["reviewing", "ready", "rejected", "failed"]);
  }

  async markReady(input: {
    id: string;
    userId: string;
    durationSeconds: number;
    tokenHash: string;
    expiresAt: string;
  }): Promise<CustomTemplateIngest> {
    const updated = await this.updateAndReturn(
      `
        UPDATE custom_template_ingests
        SET state = 'ready',
            duration_seconds = $3,
            token_hash = $4,
            reason_code = NULL,
            approved_at = now(),
            expires_at = $5::timestamptz,
            updated_at = now()
        WHERE id = $1 AND user_id = $2 AND state = 'reviewing'
        RETURNING ${ingestColumns}
      `,
      [input.id, input.userId, input.durationSeconds, input.tokenHash, input.expiresAt],
    );

    return updated ?? this.requireExistingState(input.id, input.userId, ["ready", "reserved", "consumed"]);
  }

  async markFailed(input: {
    id: string;
    userId: string;
    state: "failed" | "rejected";
    reasonCode: string;
  }): Promise<CustomTemplateIngest> {
    const updated = await this.updateAndReturn(
      `
        UPDATE custom_template_ingests
        SET state = $3, reason_code = $4, token_hash = NULL, updated_at = now()
        WHERE id = $1
          AND user_id = $2
          AND state IN ('awaiting_upload', 'transferring', 'reviewing')
        RETURNING ${ingestColumns}
      `,
      [input.id, input.userId, input.state, input.reasonCode],
    );

    return updated ?? this.requireExistingState(input.id, input.userId, [input.state]);
  }

  async reserve(id: string, userId: string): Promise<boolean> {
    const result = await this.runStateChange(
      `
        UPDATE custom_template_ingests
        SET state = 'reserved', updated_at = now()
        WHERE id = $1
          AND user_id = $2
          AND state = 'ready'
          AND consumed_at IS NULL
          AND expires_at > now()
      `,
      [id, userId],
    );

    return result;
  }

  async releaseReservation(id: string, userId: string): Promise<boolean> {
    return this.runStateChange(
      `
        UPDATE custom_template_ingests
        SET state = 'ready', updated_at = now()
        WHERE id = $1
          AND user_id = $2
          AND state = 'reserved'
          AND consumed_at IS NULL
          AND expires_at > now()
      `,
      [id, userId],
    );
  }

  async consume(id: string, userId: string, providerTaskId: string): Promise<boolean> {
    const consumed = await this.runStateChange(
      `
        UPDATE custom_template_ingests
        SET state = 'consumed',
            consumed_at = now(),
            provider_task_id = $3,
            updated_at = now()
        WHERE id = $1 AND user_id = $2 AND state = 'reserved' AND consumed_at IS NULL
      `,
      [id, userId, providerTaskId],
    );

    if (consumed) {
      return true;
    }

    return this.wasAlreadyConsumed(id, userId, providerTaskId);
  }

  async markDeleted(id: string, userId: string): Promise<void> {
    await this.runStateChange(
      `
        UPDATE custom_template_ingests
        SET state = 'deleted', token_hash = NULL, deleted_at = now(), updated_at = now()
        WHERE id = $1
          AND user_id = $2
          AND (
            state IN ('awaiting_upload', 'transferring', 'reviewing', 'ready', 'rejected', 'failed', 'consumed')
            OR (state = 'reserved' AND expires_at <= now())
          )
      `,
      [id, userId],
    );
  }

  async listCleanupCandidates(now: Date, limit: number): Promise<CustomTemplateIngest[]> {
    if (!Number.isSafeInteger(limit) || limit <= 0) {
      throw new RangeError("Cleanup limit must be a positive safe integer.");
    }

    await ensureCustomTemplateSchema(this.database);
    const result = await this.database.query<IngestRow>(
      `
        SELECT ${ingestColumns}
        FROM custom_template_ingests
        WHERE deleted_at IS NULL
          AND (
            state IN ('rejected', 'failed', 'consumed')
            OR (
              state IN ('awaiting_upload', 'transferring', 'reviewing')
              AND created_at <= $1::timestamptz - interval '1 hour'
            )
            OR (
              state IN ('ready', 'reserved')
              AND expires_at IS NOT NULL
              AND expires_at <= $1::timestamptz
            )
          )
        ORDER BY COALESCE(expires_at, consumed_at, created_at) ASC
        LIMIT $2
      `,
      [now.toISOString(), limit],
    );

    return result.rows.map(mapIngestRow);
  }

  private async updateAndReturn(
    queryText: string,
    values: unknown[],
  ): Promise<CustomTemplateIngest | null> {
    await ensureCustomTemplateSchema(this.database);
    const result = await this.database.query<IngestRow>(queryText, values);

    return result.rows[0] ? mapIngestRow(result.rows[0]) : null;
  }

  private async runStateChange(queryText: string, values: unknown[]): Promise<boolean> {
    await ensureCustomTemplateSchema(this.database);
    const result = await this.database.query(queryText, values);

    return (result.rowCount ?? 0) > 0;
  }

  private async requireExistingState(
    id: string,
    userId: string,
    allowedStates: readonly CustomTemplateState[],
  ): Promise<CustomTemplateIngest> {
    const ingest = await this.findOwned(id, userId);

    if (!ingest) {
      throw new CustomTemplateRepositoryError("NOT_FOUND", "Custom template ingest was not found.");
    }

    if (!allowedStates.includes(ingest.state)) {
      throw new CustomTemplateRepositoryError(
        "INVALID_STATE",
        `Custom template ingest cannot transition from ${ingest.state}.`,
      );
    }

    return ingest;
  }

  private async wasAlreadyConsumed(
    id: string,
    userId: string,
    providerTaskId: string,
  ): Promise<boolean> {
    await ensureCustomTemplateSchema(this.database);
    const result = await this.database.query<{ provider_task_id: string }>(
      `
        SELECT provider_task_id
        FROM custom_template_ingests
        WHERE id = $1 AND user_id = $2 AND state = 'consumed'
      `,
      [id, userId],
    );

    return result.rows[0]?.provider_task_id === providerTaskId;
  }
}

function assertIdempotentInputMatches(
  ingest: CustomTemplateIngest,
  input: CreateIngestInput,
): void {
  if (
    ingest.sourceKind !== input.sourceKind ||
    ingest.mimeType !== input.mimeType ||
    ingest.sizeBytes !== input.sizeBytes
  ) {
    throw new CustomTemplateRepositoryError(
      "IDEMPOTENCY_CONFLICT",
      "The idempotency key is already associated with a different custom template request.",
    );
  }
}

function buildQuarantineObjectKey(userId: string, ingestId: string): string {
  const userHash = createHash("sha256").update(userId, "utf8").digest("hex");
  return `custom-template-quarantine/${userHash}/${ingestId}`;
}

function requireRow(row: IngestRow | undefined): IngestRow {
  if (!row) {
    throw new Error("The database did not return the custom template ingest.");
  }

  return row;
}

function mapIngestRow(row: IngestRow): CustomTemplateIngest {
  if (!validStates.includes(row.state)) {
    throw new Error(`Database returned an unknown custom template state: ${row.state}`);
  }

  return {
    id: row.id,
    userId: row.user_id,
    idempotencyKey: row.idempotency_key,
    sourceKind: row.source_kind,
    objectKey: row.object_key,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
    state: row.state,
    tokenHash: row.token_hash,
    reasonCode: row.reason_code,
    createdAt: toIsoString(row.created_at),
    approvedAt: toNullableIsoString(row.approved_at),
    expiresAt: toNullableIsoString(row.expires_at),
    consumedAt: toNullableIsoString(row.consumed_at),
    deletedAt: toNullableIsoString(row.deleted_at),
  };
}

function toIsoString(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);

  if (!Number.isFinite(date.getTime())) {
    throw new Error("Database returned an invalid custom template timestamp.");
  }

  return date.toISOString();
}

function toNullableIsoString(value: string | Date | null): string | null {
  return value === null ? null : toIsoString(value);
}

const schemaPromises = new WeakMap<Database, Promise<void>>();

async function ensureCustomTemplateSchema(database: Database): Promise<void> {
  const existingPromise = schemaPromises.get(database);

  if (existingPromise) {
    return existingPromise;
  }

  const schemaPromise = createCustomTemplateSchema(database).catch((error) => {
    schemaPromises.delete(database);
    throw error;
  });

  schemaPromises.set(database, schemaPromise);
  return schemaPromise;
}

async function createCustomTemplateSchema(database: Database): Promise<void> {
  await database.query(`
    CREATE TABLE IF NOT EXISTS custom_template_ingests (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      idempotency_key text NOT NULL,
      source_kind text NOT NULL CHECK (source_kind IN ('upload', 'url')),
      object_key text NOT NULL UNIQUE,
      mime_type text NOT NULL CHECK (mime_type IN ('video/mp4', 'video/webm')),
      size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 52428800),
      duration_seconds double precision,
      state text NOT NULL CHECK (
        state IN ('awaiting_upload', 'transferring', 'reviewing', 'ready', 'reserved', 'rejected', 'failed', 'consumed', 'deleted')
      ),
      token_hash text,
      reason_code text,
      provider_task_id text,
      audit_references jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      approved_at timestamptz,
      expires_at timestamptz,
      consumed_at timestamptz,
      deleted_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (user_id, idempotency_key)
    )
  `);
  await database.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS custom_template_ingests_token_hash_idx
    ON custom_template_ingests (token_hash)
    WHERE token_hash IS NOT NULL
  `);
  await database.query(`
    CREATE INDEX IF NOT EXISTS custom_template_ingests_cleanup_idx
    ON custom_template_ingests (state, expires_at)
    WHERE deleted_at IS NULL
  `);
}

let pool: Pool | undefined;

function getDatabase(): Database {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for custom template persistence.");
  }

  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  return pool as Database;
}

class LazyCustomTemplateRepository implements CustomTemplateRepository {
  private get repository(): PostgresCustomTemplateRepository {
    return new PostgresCustomTemplateRepository(getDatabase());
  }

  createOrGet(input: CreateIngestInput) {
    return this.repository.createOrGet(input);
  }

  findOwned(id: string, userId: string) {
    return this.repository.findOwned(id, userId);
  }

  findByTokenHash(tokenHash: string) {
    return this.repository.findByTokenHash(tokenHash);
  }

  markReviewing(id: string, userId: string) {
    return this.repository.markReviewing(id, userId);
  }

  markReady(input: {
    id: string;
    userId: string;
    durationSeconds: number;
    tokenHash: string;
    expiresAt: string;
  }) {
    return this.repository.markReady(input);
  }

  markFailed(input: {
    id: string;
    userId: string;
    state: "failed" | "rejected";
    reasonCode: string;
  }) {
    return this.repository.markFailed(input);
  }

  reserve(id: string, userId: string) {
    return this.repository.reserve(id, userId);
  }

  releaseReservation(id: string, userId: string) {
    return this.repository.releaseReservation(id, userId);
  }

  consume(id: string, userId: string, providerTaskId: string) {
    return this.repository.consume(id, userId, providerTaskId);
  }

  markDeleted(id: string, userId: string) {
    return this.repository.markDeleted(id, userId);
  }

  listCleanupCandidates(now: Date, limit: number) {
    return this.repository.listCleanupCandidates(now, limit);
  }
}

export const customTemplateRepository: CustomTemplateRepository =
  new LazyCustomTemplateRepository();
