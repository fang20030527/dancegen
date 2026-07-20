const uploadUrlExpiresInSeconds = 600 as const;

export type CustomTemplateEnv = Record<string, string | undefined>;

export type DisabledCustomTemplateConfig = {
  enabled: false;
  uploadUrlExpiresInSeconds: typeof uploadUrlExpiresInSeconds;
};

export type EnabledCustomTemplateConfig = {
  enabled: true;
  uploadUrlExpiresInSeconds: typeof uploadUrlExpiresInSeconds;
  reviewUrl: string;
  reviewApiKey: string;
  s3Region: string;
  s3Endpoint: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  s3Bucket: string;
};

export type CustomTemplateConfig = DisabledCustomTemplateConfig | EnabledCustomTemplateConfig;

function readRequiredSetting(env: CustomTemplateEnv, name: string): string {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required when custom templates are enabled.`);
  }

  return value;
}

export function getCustomTemplateConfig(
  env: CustomTemplateEnv = process.env,
): CustomTemplateConfig {
  const enabled = env.CUSTOM_TEMPLATE_FEATURE_ENABLED?.trim() === "true";

  if (!enabled) {
    return {
      enabled: false,
      uploadUrlExpiresInSeconds,
    };
  }

  return {
    enabled: true,
    uploadUrlExpiresInSeconds,
    reviewUrl: readRequiredSetting(env, "CUSTOM_TEMPLATE_REVIEW_URL"),
    reviewApiKey: readRequiredSetting(env, "CUSTOM_TEMPLATE_REVIEW_API_KEY"),
    s3Region: readRequiredSetting(env, "S3_REGION"),
    s3Endpoint: readRequiredSetting(env, "S3_ENDPOINT"),
    s3AccessKeyId: readRequiredSetting(env, "S3_ACCESS_KEY_ID"),
    s3SecretAccessKey: readRequiredSetting(env, "S3_SECRET_ACCESS_KEY"),
    s3Bucket: readRequiredSetting(env, "S3_BUCKET"),
  };
}
