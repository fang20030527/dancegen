import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  getCustomTemplateConfig,
  type EnabledCustomTemplateConfig,
} from "./config";

export type StoredObjectHead = {
  contentType: string;
  sizeBytes: number;
};

export interface CustomTemplateStorage {
  createUploadUrl(input: {
    objectKey: string;
    contentType: string;
    sizeBytes: number;
  }): Promise<{ url: string; headers: Record<string, string> }>;
  createReadUrl(objectKey: string, expiresInSeconds: number): Promise<string>;
  getHead(objectKey: string): Promise<StoredObjectHead>;
  getPrefix(objectKey: string, byteCount: number): Promise<Uint8Array>;
  putBytes(input: {
    objectKey: string;
    contentType: string;
    bytes: Uint8Array;
  }): Promise<void>;
  deleteObject(objectKey: string): Promise<void>;
  getObjectBytes(objectKey: string): Promise<Uint8Array>;
}

type S3ClientLike = Pick<S3Client, "send">;
type SignUrl = typeof getSignedUrl;

export class S3CustomTemplateStorage implements CustomTemplateStorage {
  private readonly config: EnabledCustomTemplateConfig;
  private readonly client: S3ClientLike;
  private readonly signUrl: SignUrl;

  constructor(
    config: EnabledCustomTemplateConfig,
    client: S3ClientLike = createS3Client(config),
    signUrl: SignUrl = getSignedUrl,
  ) {
    this.config = config;
    this.client = client;
    this.signUrl = signUrl;
  }

  async createUploadUrl(input: {
    objectKey: string;
    contentType: string;
    sizeBytes: number;
  }): Promise<{ url: string; headers: Record<string, string> }> {
    const command = new PutObjectCommand({
      Bucket: this.config.s3Bucket,
      Key: input.objectKey,
      ContentType: input.contentType,
      ContentLength: input.sizeBytes,
    });
    const url = await this.signUrl(this.client as S3Client, command, {
      expiresIn: this.config.uploadUrlExpiresInSeconds,
    });

    return {
      url,
      headers: { "content-type": input.contentType },
    };
  }

  async createReadUrl(objectKey: string, expiresInSeconds: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.s3Bucket,
      Key: objectKey,
    });

    return this.signUrl(this.client as S3Client, command, { expiresIn: expiresInSeconds });
  }

  async getHead(objectKey: string): Promise<StoredObjectHead> {
    const result = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: objectKey,
      }),
    );

    if (typeof result.ContentLength !== "number" || !result.ContentType) {
      throw new Error("The stored custom template is missing authoritative metadata.");
    }

    return {
      contentType: result.ContentType,
      sizeBytes: result.ContentLength,
    };
  }

  async getPrefix(objectKey: string, byteCount: number): Promise<Uint8Array> {
    if (!Number.isSafeInteger(byteCount) || byteCount <= 0) {
      throw new RangeError("byteCount must be a positive safe integer.");
    }

    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: objectKey,
        Range: `bytes=0-${byteCount - 1}`,
      }),
    );

    return readBody(result.Body);
  }

  async putBytes(input: {
    objectKey: string;
    contentType: string;
    bytes: Uint8Array;
  }): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: input.objectKey,
        ContentType: input.contentType,
        ContentLength: input.bytes.byteLength,
        Body: input.bytes,
      }),
    );
  }

  async deleteObject(objectKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: objectKey,
      }),
    );
  }

  async getObjectBytes(objectKey: string): Promise<Uint8Array> {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: objectKey,
      }),
    );

    return readBody(result.Body);
  }
}

function createS3Client(config: EnabledCustomTemplateConfig): S3Client {
  return new S3Client({
    region: config.s3Region,
    endpoint: config.s3Endpoint,
    requestChecksumCalculation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: config.s3AccessKeyId,
      secretAccessKey: config.s3SecretAccessKey,
    },
  });
}

async function readBody(body: unknown): Promise<Uint8Array> {
  if (!body || typeof body !== "object" || !("transformToByteArray" in body)) {
    throw new Error("The object store returned an unreadable response body.");
  }

  const transformToByteArray = (body as {
    transformToByteArray?: () => Promise<Uint8Array>;
  }).transformToByteArray;

  if (typeof transformToByteArray !== "function") {
    throw new Error("The object store returned an unreadable response body.");
  }

  return transformToByteArray.call(body);
}

let configuredStorage: S3CustomTemplateStorage | undefined;

function getConfiguredStorage(): S3CustomTemplateStorage {
  if (configuredStorage) {
    return configuredStorage;
  }

  const config = getCustomTemplateConfig();

  if (!config.enabled) {
    throw new Error("Custom template storage is unavailable while the feature is disabled.");
  }

  configuredStorage = new S3CustomTemplateStorage(config);
  return configuredStorage;
}

export const customTemplateStorage: CustomTemplateStorage = {
  createUploadUrl: (input) => getConfiguredStorage().createUploadUrl(input),
  createReadUrl: (objectKey, expiresInSeconds) =>
    getConfiguredStorage().createReadUrl(objectKey, expiresInSeconds),
  getHead: (objectKey) => getConfiguredStorage().getHead(objectKey),
  getPrefix: (objectKey, byteCount) => getConfiguredStorage().getPrefix(objectKey, byteCount),
  putBytes: (input) => getConfiguredStorage().putBytes(input),
  deleteObject: (objectKey) => getConfiguredStorage().deleteObject(objectKey),
  getObjectBytes: (objectKey) => getConfiguredStorage().getObjectBytes(objectKey),
};
