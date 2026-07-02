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
    description: "Monthly credits and creator tools for regular AI dance video publishing.",
    entitlements: [
      "400 credits per month",
      "HD/no-watermark downloads included",
      "Advanced dance model",
      "Priority queue",
      "Commercial use",
      "Failed runs return credits",
    ],
  },
} as const;

export const pricingPlanKeys = [pricingPlans.singleUnlock.key, pricingPlans.creatorMonthly.key] as const;

export type PricingPlanKey = (typeof pricingPlanKeys)[number];

export const pricingDisplayPlans = [
  {
    key: "free",
    name: "Free",
    priceLabel: "$0",
    cadenceLabel: "forever",
    description: "For trying the upload, template, and preview flow before you subscribe.",
    creditsLabel: "20 trial credits",
    creditsNote: "Watermarked previews",
    entitlements: ["Watermarked previews", "Standard queue", "7-day result history", "Safe public templates"],
    ctaLabel: "Start free",
    ctaHref: "/ai-dance-generator",
  },
  {
    key: "starter_monthly_display",
    name: "Starter",
    priceLabel: "$9.99",
    cadenceLabel: "per month",
    yearlyPriceLabel: "$95.88",
    yearlyCadenceLabel: "per year",
    yearlyEquivalentLabel: "$7.99/mo",
    yearlySavingsLabel: "Save $24/year",
    monthlySavingsLabel: "$2 less per month",
    description: "For occasional posts and testing multiple dance templates each month.",
    creditsLabel: "120 credits / month",
    creditsNote: "Enough for light publishing",
    entitlements: ["6 Default videos / month", "HD downloads", "Remove watermark", "Failed runs return credits"],
    ctaLabel: "Choose Starter",
    ctaHref: "/ai-dance-generator",
  },
  {
    ...pricingPlans.creatorMonthly,
    priceLabel: "$19.99",
    cadenceLabel: "per month",
    yearlyPriceLabel: "$191.88",
    yearlyCadenceLabel: "per year",
    yearlyEquivalentLabel: "$15.99/mo",
    yearlySavingsLabel: "Save $48/year",
    monthlySavingsLabel: "$4 less per month",
    description: "For creators posting weekly and comparing more advanced motion results.",
    creditsLabel: "400 credits / month",
    creditsNote: "8 Better videos or 20 Default videos",
    badge: "Recommended",
    featured: true,
    ctaLabel: "Choose Creator",
    checkoutPriceKey: pricingPlans.creatorMonthly.key,
  },
  {
    key: "pro_monthly_display",
    name: "Pro",
    priceLabel: "$49.99",
    cadenceLabel: "per month",
    yearlyPriceLabel: "$479.88",
    yearlyCadenceLabel: "per year",
    yearlyEquivalentLabel: "$39.99/mo",
    yearlySavingsLabel: "Save $120/year",
    monthlySavingsLabel: "$10 less per month",
    description: "For high-volume publishing, rapid template testing, and campaign batches.",
    creditsLabel: "1,200 credits / month",
    creditsNote: "Built for frequent output",
    entitlements: ["24 Better videos / month", "Batch generation", "Highest queue priority", "1-month credit rollover"],
    ctaLabel: "Choose Pro",
    ctaHref: "/ai-dance-generator",
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
