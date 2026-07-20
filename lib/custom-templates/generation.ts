import type { DanceModelId } from "../dance/models.ts";
import type { DanceGenerationTask, DanceTemplate } from "../dance/types.ts";
import {
  hashCustomTemplateToken,
  isOwnedUsableIngest,
  type CustomTemplateRepository,
} from "./repository.ts";
import type { TemplateSource } from "./types.ts";

export type GenerationTemplateSelection = {
  userId: string;
  templateId?: string;
  customTemplateToken?: string;
  modelId: DanceModelId;
};

export type ResolvedGenerationTemplate = {
  templateSource: TemplateSource;
  displayTemplateId: string;
  customTemplateIngestId?: string;
  moderationTemplate?: DanceTemplate;
};

type ResolveDependencies = {
  repository: Pick<CustomTemplateRepository, "findByTokenHash">;
  hasActiveCreatorSubscription(userId: string): Promise<boolean>;
  findPublicTemplate(templateId: string): DanceTemplate | undefined;
  now(): Date;
};

type ReservationRepository = Pick<
  CustomTemplateRepository,
  "reserve" | "releaseReservation" | "consume"
>;

type ReconciliationLogger = {
  error(message: string, context: Record<string, string>): void;
};

export class GenerationTemplateError extends Error {
  readonly code: GenerationTemplateErrorCode;

  constructor(code: GenerationTemplateErrorCode) {
    super(code);
    this.name = "GenerationTemplateError";
    this.code = code;
  }
}

type GenerationTemplateErrorCode =
  | "TEMPLATE_SELECTION_INVALID"
  | "TEMPLATE_NOT_AVAILABLE"
  | "CUSTOM_TEMPLATE_MEMBER_REQUIRED"
  | "CUSTOM_TEMPLATE_MODEL_REQUIRED"
  | "CUSTOM_TEMPLATE_NOT_AVAILABLE"
  | "CUSTOM_TEMPLATE_EXPIRED"
  | "CUSTOM_TEMPLATE_ALREADY_CONSUMED"
  | "CUSTOM_TEMPLATE_NOT_READY"
  | "CUSTOM_TEMPLATE_ALREADY_RESERVED";

export async function resolveGenerationTemplateSource(
  selection: GenerationTemplateSelection,
  dependencies: ResolveDependencies,
): Promise<ResolvedGenerationTemplate> {
  assertExactlyOneTemplateSelection(selection);

  if (selection.templateId) {
    return resolvePlatformTemplate(selection.templateId, dependencies.findPublicTemplate);
  }

  return resolveCustomTemplate(selection, dependencies);
}

export async function submitGenerationWithTemplateReservation(
  input: {
    resolved: ResolvedGenerationTemplate;
    userId: string;
    submit(): Promise<DanceGenerationTask>;
  },
  repository: ReservationRepository,
  logger: ReconciliationLogger = console,
): Promise<DanceGenerationTask> {
  if (input.resolved.templateSource.kind === "platform") {
    return input.submit();
  }

  const ingestId = input.resolved.templateSource.ingestId;
  if (!(await repository.reserve(ingestId, input.userId))) {
    throw new GenerationTemplateError("CUSTOM_TEMPLATE_ALREADY_RESERVED");
  }

  const task = await submitAndReleaseReservationOnFailure(
    input.submit,
    ingestId,
    input.userId,
    repository,
    logger,
  );
  const providerTaskId = task.providerJobId ?? task.id;
  await reconcileConsumedReservation(
    ingestId,
    input.userId,
    providerTaskId,
    repository,
    logger,
  );

  return task;
}

async function reconcileConsumedReservation(
  ingestId: string,
  userId: string,
  providerTaskId: string,
  repository: ReservationRepository,
  logger: ReconciliationLogger,
): Promise<void> {
  try {
    const consumed = await repository.consume(ingestId, userId, providerTaskId);
    if (!consumed) {
      logger.error("Custom template reservation needs reconciliation.", {
        operation: "consume",
        outcome: "returned_false",
        ingestId,
        providerTaskId,
      });
    }
  } catch (error) {
    logger.error("Custom template reservation needs reconciliation.", {
      operation: "consume",
      outcome: "threw",
      errorName: getSafeErrorName(error),
      ingestId,
      providerTaskId,
    });
  }
}

async function submitAndReleaseReservationOnFailure(
  submit: () => Promise<DanceGenerationTask>,
  ingestId: string,
  userId: string,
  repository: ReservationRepository,
  logger: ReconciliationLogger,
): Promise<DanceGenerationTask> {
  try {
    return await submit();
  } catch (error) {
    await releaseReservationSafely(ingestId, userId, repository, logger);
    throw error;
  }
}

async function releaseReservationSafely(
  ingestId: string,
  userId: string,
  repository: ReservationRepository,
  logger: ReconciliationLogger,
): Promise<void> {
  try {
    const released = await repository.releaseReservation(ingestId, userId);
    if (!released) {
      logger.error("Custom template reservation release failed.", {
        operation: "release",
        outcome: "returned_false",
        ingestId,
      });
    }
  } catch (error) {
    logger.error("Custom template reservation release failed.", {
      operation: "release",
      outcome: "threw",
      errorName: getSafeErrorName(error),
      ingestId,
    });
  }
}

async function resolveCustomTemplate(
  selection: GenerationTemplateSelection,
  dependencies: ResolveDependencies,
): Promise<ResolvedGenerationTemplate> {
  if (selection.modelId !== "viggle-v4-preview") {
    throw new GenerationTemplateError("CUSTOM_TEMPLATE_MODEL_REQUIRED");
  }

  if (!(await dependencies.hasActiveCreatorSubscription(selection.userId))) {
    throw new GenerationTemplateError("CUSTOM_TEMPLATE_MEMBER_REQUIRED");
  }

  const token = selection.customTemplateToken as string;
  const ingest = await dependencies.repository.findByTokenHash(hashCustomTemplateToken(token));
  if (!ingest || ingest.userId !== selection.userId) {
    throw new GenerationTemplateError("CUSTOM_TEMPLATE_NOT_AVAILABLE");
  }
  if (ingest.consumedAt !== null || ingest.state === "consumed") {
    throw new GenerationTemplateError("CUSTOM_TEMPLATE_ALREADY_CONSUMED");
  }
  if (hasExpired(ingest.expiresAt, dependencies.now())) {
    throw new GenerationTemplateError("CUSTOM_TEMPLATE_EXPIRED");
  }
  if (!isOwnedUsableIngest(ingest, selection.userId, dependencies.now())) {
    throw new GenerationTemplateError("CUSTOM_TEMPLATE_NOT_READY");
  }

  return {
    templateSource: {
      kind: "custom",
      ingestId: ingest.id,
      objectKey: ingest.objectKey,
      mimeType: ingest.mimeType,
    },
    displayTemplateId: "custom-member-video",
    customTemplateIngestId: ingest.id,
  };
}

function resolvePlatformTemplate(
  templateId: string,
  findPublicTemplate: ResolveDependencies["findPublicTemplate"],
): ResolvedGenerationTemplate {
  const template = findPublicTemplate(templateId);
  if (!template?.isPublic) {
    throw new GenerationTemplateError("TEMPLATE_NOT_AVAILABLE");
  }

  return {
    templateSource: { kind: "platform", templateId: template.id },
    displayTemplateId: template.id,
    moderationTemplate: template,
  };
}

function assertExactlyOneTemplateSelection(selection: GenerationTemplateSelection): void {
  if (Boolean(selection.templateId) === Boolean(selection.customTemplateToken)) {
    throw new GenerationTemplateError("TEMPLATE_SELECTION_INVALID");
  }
}

function hasExpired(expiresAt: string | null, now: Date): boolean {
  const timestamp = expiresAt === null ? Number.NaN : Date.parse(expiresAt);
  return !Number.isFinite(timestamp) || timestamp <= now.getTime();
}

function getSafeErrorName(error: unknown): string {
  return error instanceof Error && error.name ? error.name : "UnknownError";
}
