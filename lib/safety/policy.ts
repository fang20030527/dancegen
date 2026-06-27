import type { UploadReviewResult } from "@/lib/dance/types";

const blockedFilenameSignals = [
  "minor",
  "child",
  "teen",
  "kid",
  "celebrity",
  "famous",
  "bikini",
  "swimwear",
  "lingerie",
  "group",
  "anime",
];

export const uploadPolicyRules = [
  "Clear single adult human photo",
  "No minors, public figures, anime characters, group photos, nudity, swimwear, or underwear",
  "Face and body structure must be visible enough for conservative review",
  "Uploader confirms legal rights to use the image",
];

export function reviewUploadFilename(fileName: string): UploadReviewResult {
  const normalizedFileName = fileName.toLowerCase();
  const matchedSignal = blockedFilenameSignals.find((signal) => normalizedFileName.includes(signal));

  if (matchedSignal) {
    return {
      allowed: false,
      reasonCode: `filename_signal_${matchedSignal}`,
      userMessage: "This image needs a different source photo. Use a clear adult solo portrait that you own.",
    };
  }

  return {
    allowed: true,
    userMessage: "Pre-check passed. Final input and output review still run before download is enabled.",
  };
}
