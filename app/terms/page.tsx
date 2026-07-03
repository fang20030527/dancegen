import type { Metadata } from "next";

import { LegalShell } from "@/components/sections/legal-shell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "DanceClip AI terms for safe AI dance video generation.",
};

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
        or images where age and consent cannot be reasonably assessed.
      </p>
      <h2>Generated output</h2>
      <p>
        Generated results may be watermarked until unlocked. DanceClip AI may block previews or downloads when review
        systems identify safety, consent, abuse, or rights concerns.
      </p>
      <h2>Enforcement</h2>
      <p>
        Accounts may be frozen or banned for repeat abuse, chargebacks, impersonation, unauthorized uploads, or attempts
        to bypass safety controls.
      </p>
    </LegalShell>
  );
}
