export const pricingPlans = {
  singleUnlock: {
    key: "single_hd_unlock",
    name: "One Video Pass",
    priceLabel: "$3.99",
    description: "Unlock HD and remove the watermark for one successful result.",
    entitlements: ["1 successful video unlock", "HD download", "No watermark", "Limited-time download link"],
  },
  starterMonthly: {
    key: "starter_monthly",
    name: "Starter",
    priceLabel: "$9.99/mo",
    creditsPerMonth: 120,
    description: "Monthly credits for occasional AI dance video generation.",
    entitlements: ["120 credits per month", "Default dance model", "HD downloads", "Failed runs return credits"],
  },
  starterAnnual: {
    key: "starter_annual",
    name: "Starter Annual",
    priceLabel: "$95.88/yr",
    creditsPerMonth: 120,
    description: "Annual Starter credits billed once per year.",
    entitlements: ["120 credits per month", "Default dance model", "HD downloads", "Save 20%"],
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
  creatorAnnual: {
    key: "creator_annual",
    name: "Creator Annual",
    priceLabel: "$191.88/yr",
    creditsPerMonth: 400,
    description: "Annual Creator credits and advanced model access billed once per year.",
    entitlements: [
      "400 credits per month",
      "HD/no-watermark downloads included",
      "Advanced dance model",
      "Priority queue",
      "Commercial use",
      "Save 20%",
    ],
  },
  proMonthly: {
    key: "pro_monthly",
    name: "Pro",
    priceLabel: "$49.99/mo",
    creditsPerMonth: 1200,
    description: "High-volume credits for frequent publishing and batch testing.",
    entitlements: ["1,200 credits per month", "Advanced dance model", "Highest queue priority", "1-month credit rollover"],
  },
  proAnnual: {
    key: "pro_annual",
    name: "Pro Annual",
    priceLabel: "$479.88/yr",
    creditsPerMonth: 1200,
    description: "Annual Pro credits for high-volume publishing billed once per year.",
    entitlements: ["1,200 credits per month", "Advanced dance model", "Highest queue priority", "Save 20%"],
  },
} as const;

export const pricingPlanKeys = [
  pricingPlans.singleUnlock.key,
  pricingPlans.starterMonthly.key,
  pricingPlans.starterAnnual.key,
  pricingPlans.creatorMonthly.key,
  pricingPlans.creatorAnnual.key,
  pricingPlans.proMonthly.key,
  pricingPlans.proAnnual.key,
] as const;

export type PricingPlanKey = (typeof pricingPlanKeys)[number];

export const subscriptionPricingPlanKeys = [
  pricingPlans.starterMonthly.key,
  pricingPlans.starterAnnual.key,
  pricingPlans.creatorMonthly.key,
  pricingPlans.creatorAnnual.key,
  pricingPlans.proMonthly.key,
  pricingPlans.proAnnual.key,
] as const satisfies readonly PricingPlanKey[];

export const advancedModelPricingPlanKeys = [
  pricingPlans.creatorMonthly.key,
  pricingPlans.creatorAnnual.key,
  pricingPlans.proMonthly.key,
  pricingPlans.proAnnual.key,
] as const satisfies readonly PricingPlanKey[];

export const subscriptionPlanPriority = [
  pricingPlans.proAnnual.key,
  pricingPlans.proMonthly.key,
  pricingPlans.creatorAnnual.key,
  pricingPlans.creatorMonthly.key,
  pricingPlans.starterAnnual.key,
  pricingPlans.starterMonthly.key,
] as const satisfies readonly PricingPlanKey[];

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
    key: pricingPlans.starterMonthly.key,
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
    ctaLabel: "Choose monthly",
    annualCtaLabel: "Choose annual",
    checkoutPriceKey: pricingPlans.starterMonthly.key,
    annualCheckoutPriceKey: pricingPlans.starterAnnual.key,
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
    ctaLabel: "Choose monthly",
    annualCtaLabel: "Choose annual",
    checkoutPriceKey: pricingPlans.creatorMonthly.key,
    annualCheckoutPriceKey: pricingPlans.creatorAnnual.key,
  },
  {
    key: pricingPlans.proMonthly.key,
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
    ctaLabel: "Choose monthly",
    annualCtaLabel: "Choose annual",
    checkoutPriceKey: pricingPlans.proMonthly.key,
    annualCheckoutPriceKey: pricingPlans.proAnnual.key,
  },
] as const;

export function isPricingPlanKey(value: unknown): value is PricingPlanKey {
  return typeof value === "string" && pricingPlanKeys.includes(value as PricingPlanKey);
}

export function getPricingPlanByKey(key: PricingPlanKey) {
  return Object.values(pricingPlans).find((plan) => plan.key === key);
}

export function getPlanAccountSummary(key: PricingPlanKey | null | undefined) {
  switch (key) {
    case pricingPlans.starterMonthly.key:
    case pricingPlans.starterAnnual.key:
      return {
        creditsLabel: "120 credits",
        planLabel: "Starter",
      };
    case pricingPlans.creatorMonthly.key:
    case pricingPlans.creatorAnnual.key:
      return {
        creditsLabel: "400 credits",
        planLabel: "Creator",
      };
    case pricingPlans.proMonthly.key:
    case pricingPlans.proAnnual.key:
      return {
        creditsLabel: "1,200 credits",
        planLabel: "Pro",
      };
    default:
      return null;
  }
}

export const starterEntitlements = {
  freeGenerationsAfterGoogleLogin: 1,
  resultRetentionDaysMin: 7,
  resultRetentionDaysMax: 14,
};
