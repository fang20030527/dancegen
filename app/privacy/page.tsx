import type { Metadata } from "next";

import { LegalShell } from "@/components/sections/legal-shell";
import { createPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy",
  description:
    "Review how DanceClip AI handles uploaded photos, generated dance previews, media retention, training use, safety evidence, deletion requests, and abuse reports.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalShell
      description="This MVP minimizes user media retention and does not use uploads or generated results to train product-side models."
      title="Privacy Policy"
    >
      <h2>Media handling</h2>
      <p>
        Users upload photos to generate short dance previews. Login users&apos; generated results should be retained for 7 to
        14 days by default, then deleted or made unavailable unless a longer retention obligation applies.
      </p>
      <h2>Member custom videos</h2>
      <p>
        Creator members may supply a short driving video they own or are authorized to use. Custom videos are stored in
        private storage, are available only to the member who supplied them, and undergo automated format and safety
        review before use. We do not use custom videos for model training. The media object is deleted after the member
        removes it, review rejects it, one generation consumes it, processing fails, or its 24-hour approval window
        expires.
      </p>
      <h2>Training use</h2>
      <p>
        DanceClip AI does not use uploaded photos, custom driving videos, or generated results to train product-side
        models. Before enabling production processing, third-party provider terms for retention, training use, human
        review, and deletion must be verified. A provider must not receive user media until those terms and the required
        data controls have passed launch review.
      </p>
      <h2>Safety evidence</h2>
      <p>
        Minimal audit evidence may be retained for abuse handling, payment disputes, safety review, and legal compliance.
      </p>
    </LegalShell>
  );
}
