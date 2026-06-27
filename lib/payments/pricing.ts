export const pricingPlans = {
  singleUnlock: {
    key: "single_hd_unlock",
    name: "Single video unlock",
    priceLabel: "$3.99",
    description: "Unlock HD and remove the watermark for one successful video.",
    entitlements: ["HD download", "No watermark", "Limited-time download link"],
  },
  creatorMonthly: {
    key: "creator_monthly",
    name: "Creator monthly",
    priceLabel: "$14.99/mo",
    description: "Monthly generation allowance with HD/no-watermark downloads included.",
    entitlements: ["Fixed monthly generations", "HD downloads", "Refunded generation on model or safety failure"],
  },
} as const;

export const starterEntitlements = {
  freeGenerationsAfterGoogleLogin: 1,
  resultRetentionDaysMin: 7,
  resultRetentionDaysMax: 14,
};
