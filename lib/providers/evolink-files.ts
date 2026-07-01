import { Buffer } from "node:buffer";

import { getEvolinkApiKey, getEvolinkFilesApiUrl } from "@/lib/providers/evolink-config";

type EvolinkFileUploadData = {
  file_id?: string;
  file_url?: string;
  download_url?: string;
  expires_at?: string;
};

type EvolinkFileUploadResponse = {
  code?: number;
  message?: string;
  data?: EvolinkFileUploadData;
};

export type EvolinkUploadedFile = {
  fileId?: string;
  fileUrl: string;
  expiresAt?: string;
};

export class EvolinkFileUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvolinkFileUploadError";
  }
}

export async function uploadImageFileToEvolink(file: File): Promise<EvolinkUploadedFile> {
  const response = await fetch(`${getEvolinkFilesApiUrl()}/api/v1/files/upload/base64`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getEvolinkApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      base64_data: await fileToBase64(file),
      filename: file.name || "source-image",
    }),
  });

  const payload = (await response.json().catch(() => null)) as EvolinkFileUploadResponse | null;

  if (!response.ok || payload?.code !== 0 || !payload.data) {
    throw new EvolinkFileUploadError(payload?.message || `EvoLink file upload failed with ${response.status}.`);
  }

  const fileUrl = payload.data.file_url || payload.data.download_url;

  if (!fileUrl) {
    throw new EvolinkFileUploadError("EvoLink file upload did not return a usable file URL.");
  }

  return {
    fileId: payload.data.file_id,
    fileUrl,
    expiresAt: payload.data.expires_at,
  };
}

async function fileToBase64(file: File) {
  return Buffer.from(await file.arrayBuffer()).toString("base64");
}
