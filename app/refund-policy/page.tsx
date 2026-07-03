import type { Metadata } from "next";

import { LegalShell } from "@/components/sections/legal-shell";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "DanceClip AI refund and generation return policy.",
};

export default function RefundPolicyPage() {
  return (
    <LegalShell
      description="The MVP separates generation reservations from paid HD unlocks."
      title="Refund Policy"
    >
      <h2>Generation returns</h2>
      <p>
        Model failures, system timeouts, transfer failures, and output safety blocks should automatically return the
        reserved generation allowance.
      </p>
      <h2>Single-video unlocks</h2>
      <p>
        Single-video unlocks apply to successful videos only. If an unlock is charged but webhook verification or
        entitlement delivery fails, the payment must be reconciled through the payment and entitlement ledger.
      </p>
      <h2>Abuse and chargebacks</h2>
      <p>
        Refunds may be refused or accounts frozen when evidence shows abuse, unauthorized uploads, or payment fraud.
      </p>
    </LegalShell>
  );
}
