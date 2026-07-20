import type { Metadata } from "next";

import { LegalShell } from "@/components/sections/legal-shell";
import { createPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "Terms of Service",
  description:
    "Read the DanceClip AI terms for authorized adult solo photos, safe AI dance video generation, blocked content, generated outputs, and abuse enforcement.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalShell
      description="DanceClip AI is for authorized adult solo photos and low-risk short-form content testing."
      title="Terms of Service"
    >
      <h2>Allowed use</h2>
      <p>
        You may generate short silent dance previews from photos you own or are authorized to use. You must not upload
        minors, public figures, private third parties without permission, explicit images, group photos, anime characters,
        face-swap or deepfake material, or images where age and consent cannot be reasonably assessed. You must also
        follow the <a href="/acceptable-use">Acceptable Use Policy</a>.
      </p>
      <h2>Custom driving videos</h2>
      <p>
        An eligible Creator member may upload or import a short driving video only when the member owns it or has all
        permissions needed to use every person and recording in it. Custom videos are private, undergo automated safety
        review, are not used for model training, and may be used for one generation only. They are deleted after removal,
        rejection, consumption, failure, or expiry of the 24-hour approval window.
      </p>
      <h2>Prohibited requests</h2>
      <p>
        You must not request, create, unlock, distribute, or attempt to bypass safeguards for NSFW, explicit, sexually
        suggestive, non-consensual, hateful, violent, illegal, impersonating, face-manipulated, or age-ambiguous content.
        DanceClip AI is not an adult content product and does not permit pornographic or sexually oriented AI generation.
      </p>
      <h2>Generated output</h2>
      <p>
        Generated results may be watermarked until unlocked. DanceClip AI may block previews or downloads when review
        systems identify safety, moderation, consent, abuse, or rights concerns.
      </p>
      <h2>Enforcement</h2>
      <p>
        Accounts may be frozen, refunded, limited, suspended, or banned for repeat abuse, chargebacks, impersonation,
        unauthorized uploads, unsafe generation attempts, or attempts to bypass safety controls.
      </p>
    </LegalShell>
  );
}
