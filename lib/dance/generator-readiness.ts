export type GeneratorTemplateState =
  | "platform"
  | "idle"
  | "validating"
  | "transferring"
  | "reviewing"
  | "ready"
  | "failed";

export type GeneratorReadinessInput = {
  hasImage: boolean;
  isBusy: boolean;
  templateState: GeneratorTemplateState;
  signedIn: boolean;
  hasCreatorAccess: boolean;
  rightsConfirmed?: boolean;
  compatibleModelSelected?: boolean;
  customTemplatesEnabled?: boolean;
  customTemplateUsed?: boolean;
};

export type GeneratorReadiness =
  | { ready: true; message: null }
  | { ready: false; message: string };

export function getGeneratorReadiness(input: GeneratorReadinessInput): GeneratorReadiness {
  const usesCustomTemplate = input.templateState !== "platform";
  if (usesCustomTemplate && input.customTemplatesEnabled === false) {
    return { ready: false, message: "Custom video templates are currently unavailable." };
  }

  if (!input.hasImage) {
    return { ready: false, message: "Upload or choose a reference image." };
  }

  if (!input.signedIn) {
    return {
      ready: false,
      message: usesCustomTemplate
        ? "Continue with Google to use a custom video."
        : "Continue with Google to generate your dance video.",
    };
  }

  if (usesCustomTemplate && !input.hasCreatorAccess) {
    return { ready: false, message: "Upgrade to Creator to use a custom video." };
  }

  const templateMessage = getTemplateStateMessage(input.templateState);
  if (templateMessage) {
    return { ready: false, message: templateMessage };
  }

  if (usesCustomTemplate && input.customTemplateUsed) {
    return {
      ready: false,
      message: "This custom video has already been used. Replace it to generate again.",
    };
  }

  if (input.rightsConfirmed === false) {
    return { ready: false, message: "Confirm that you have the right to use this content." };
  }

  if (usesCustomTemplate && input.compatibleModelSelected === false) {
    return { ready: false, message: "Custom videos require the Viggle model." };
  }

  if (input.isBusy) {
    return { ready: false, message: "Please wait for the current check or generation." };
  }

  return { ready: true, message: null };
}

function getTemplateStateMessage(templateState: GeneratorTemplateState): string | null {
  switch (templateState) {
    case "idle":
      return "Upload or import a custom video.";
    case "validating":
      return "Checking your custom video details.";
    case "transferring":
      return "Your custom video is still transferring.";
    case "reviewing":
      return "Your custom video is still being reviewed.";
    case "failed":
      return "Retry or choose another custom video.";
    case "platform":
    case "ready":
      return null;
  }
}
