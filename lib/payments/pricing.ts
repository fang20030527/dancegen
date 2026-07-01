export const pricingPlans = {
  singleUnlock: {
    key: "single_hd_unlock",
    name: "One Video Pass",
    priceLabel: "$3.99",
    description: "Unlock HD and remove the watermark for one successful result.",
    entitlements: ["1 successful video unlock", "HD download", "No watermark", "Limited-time download link"],
  },
  creatorMonthly: {
    key: "creator_monthly",
    name: "Creator",
    priceLabel: "$19.99/mo",
    description: "Monthly allowance for creators who make dance videos regularly.",
    entitlements: [
      "25 standard video allowance per month",
      "HD/no-watermark downloads included",
      "Advanced model uses more allowance",
      "Failed or blocked generations are returned",
    ],
  },
} as const;

export const pricingPlanKeys = [pricingPlans.singleUnlock.key, pricingPlans.creatorMonthly.key] as const;

export type PricingPlanKey = (typeof pricingPlanKeys)[number];

export const studioDisplayPlan = {
  key: "studio_monthly_display",
  name: "Studio",
  priceLabel: "$49.99/mo",
  description: "Higher monthly allowance for frequent accounts, agencies, and small teams.",
  entitlements: [
    "80 standard video allowance per month",
    "HD/no-watermark downloads included",
    "Advanced model uses more allowance",
    "Highest priority queue",
  ],
} as const;

export const pricingDisplayPlans = [
  {
    ...pricingPlans.singleUnlock,
    ctaLabel: "Unlock one video",
    checkoutPriceKey: pricingPlans.singleUnlock.key,
  },
  {
    ...pricingPlans.creatorMonthly,
    badge: "Most popular",
    ctaLabel: "Start Creator",
    checkoutPriceKey: pricingPlans.creatorMonthly.key,
  },
  {
    ...studioDisplayPlan,
    badge: "High volume",
    ctaLabel: "Contact us",
  },
] as const;

export function isPricingPlanKey(value: unknown): value is PricingPlanKey {
  return typeof value === "string" && pricingPlanKeys.includes(value as PricingPlanKey);
}

export function getPricingPlanByKey(key: PricingPlanKey) {
  return Object.values(pricingPlans).find((plan) => plan.key === key);
}

export const starterEntitlements = {
  freeGenerationsAfterGoogleLogin: 1,
  resultRetentionDaysMin: 7,
  resultRetentionDaysMax: 14,
};
