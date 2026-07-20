import type { Metadata } from "next";

import { LegalShell } from "@/components/sections/legal-shell";
import { createPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "Acceptable Use Policy",
  description:
    "Review the DanceClip AI acceptable use rules for authorized adult solo photos, safe dance generation, prohibited content, impersonation, and moderation.",
  path: "/acceptable-use",
});

export default function AcceptableUsePage() {
  return (
    <LegalShell
      description="DanceClip AI is for authorized, adult, solo photo-to-dance generation with conservative templates and pre-generation moderation."
      title="Acceptable Use Policy"
    >
      <h2>Allowed source media</h2>
      <p>
        Upload only clear solo photos of adults when you own the photo or have permission to use it. You are responsible
        for confirming the person in the image is an adult, the image rights are yours to use, and the generated result
        will not mislead viewers about consent or identity.
      </p>
      <h2>Custom driving videos</h2>
      <p>
        Upload or import a driving video only if you own the recording or have explicit authorization to use it and every
        person shown. A custom video must contain permitted adult content, pass automated safety review, and may not be
        used to evade the source-photo or output safeguards. Custom videos remain private, are not used for model
        training, and are deleted after removal, rejection, one-time consumption, processing failure, or 24-hour expiry.
      </p>
      <h2>Prohibited content</h2>
      <p>
        Do not upload, request, generate, unlock, share, or attempt to route content involving nudity, explicit sexual
        content, sexually suggestive output, minors, age-ambiguous people, non-consensual intimate content, escort or
        adult services, harassment, hate, graphic violence, illegal activity, or content designed to bypass safety
        controls.
      </p>
      <h2>Identity and consent</h2>
      <p>
        Do not use DanceClip AI for face swaps, deepfakes, face manipulation, impersonation, public figures, celebrities,
        private third parties without permission, political persuasion, scams, or content that falsely implies someone
        said, did, endorsed, or consented to something.
      </p>
      <h2>Moderation and enforcement</h2>
      <p>
        DanceClip AI screens generation instructions before model submission and may block or refund requests that are
        unsafe, flagged, suspicious, or outside this policy. Accounts may be limited, suspended, or banned for repeat
        violations, payment abuse, attempts to evade moderation, or misuse reports that cannot be resolved.
      </p>
      <h2>Reporting</h2>
      <p>
        Report suspected misuse, impersonation, non-consensual content, or deletion requests to{" "}
        <a href={`mailto:${siteConfig.abuseEmail}`}>{siteConfig.abuseEmail}</a>. General product support is available at{" "}
        <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a>.
      </p>
    </LegalShell>
  );
}
