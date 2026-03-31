export type RechargePlan = {
  id: string;
  price: number;
  validity: string;
  data: string;
  description: string;
  category: string;
  popular?: boolean;
};

/** Demo prepaid plans for plan picker & quick actions */
export const RECHARGE_PLANS: RechargePlan[] = [
  {
    id: "p26",
    price: 26,
    validity: "1 Day",
    data: "1.5GB",
    description:
      "Get 1.5 GB Data for 1 day (Expires at 11:59 PM). No service validity.",
    category: "Popular",
    popular: true,
  },
  {
    id: "p33",
    price: 33,
    validity: "1 Day",
    data: "2GB",
    description: "2 GB high-speed data for 1 calendar day.",
    category: "Popular",
  },
  {
    id: "p48",
    price: 48,
    validity: "28 Days",
    data: "6GB",
    description: "6 GB total data. Valid for 28 days.",
    category: "Popular",
    popular: true,
  },
  {
    id: "p49",
    price: 49,
    validity: "28 Days",
    data: "20GB",
    description: "20 GB total data with 28 days validity.",
    category: "Popular",
    popular: true,
  },
  {
    id: "p101",
    price: 101,
    validity: "28 Days",
    data: "12GB",
    description: "12 GB data + unlimited calls for 28 days.",
    category: "121 Made for you",
  },
  {
    id: "p299",
    price: 299,
    validity: "28 Days",
    data: "2 GB/Day",
    description: "2 GB/day + unlimited calls. Truly unlimited.",
    category: "121 Made for you",
  },
  {
    id: "p859",
    price: 859,
    validity: "84 Days",
    data: "2 GB/Day",
    description: "2 GB/day for 84 days. Best value long validity.",
    category: "Popular",
  },
  {
    id: "p19",
    price: 19,
    validity: "1 Day",
    data: "1GB",
    description: "1 GB data pack, 1 day.",
    category: "Add On Data",
  },
  {
    id: "p39",
    price: 39,
    validity: "7 Days",
    data: "5GB",
    description: "5 GB add-on valid for 7 days.",
    category: "Add On Data",
  },
  {
    id: "p151",
    price: 151,
    validity: "30 Days",
    data: "Cricket HD",
    description: "Cricket streaming + data combo for 30 days.",
    category: "Cricket",
  },
  {
    id: "p601",
    price: 601,
    validity: "84 Days",
    data: "1.5 GB/Day",
    description: "Daily data with unlimited calls, 84 days.",
    category: "Non Stop",
  },
];

export const RECHARGE_TABS = [
  "121 Made for you",
  "Popular",
  "Add On Data",
  "Cricket",
  "Non Stop",
] as const;

export function quickRechargePlans(): RechargePlan[] {
  const popular = RECHARGE_PLANS.filter((p) => p.popular);
  if (popular.length >= 3) return popular.slice(0, 3);
  return RECHARGE_PLANS.slice(0, 3);
}

export function plansForTab(tab: string): RechargePlan[] {
  if (tab === "Popular") {
    return RECHARGE_PLANS.filter(
      (p) => p.category === "Popular" || p.popular,
    );
  }
  return RECHARGE_PLANS.filter((p) => p.category === tab);
}

export function searchPlans(
  query: string,
  tab: string,
): RechargePlan[] {
  const base = plansForTab(tab);
  const q = query.trim().toLowerCase();
  if (!q) return base;
  return base.filter(
    (p) =>
      String(p.price).includes(q) ||
      p.validity.toLowerCase().includes(q) ||
      p.data.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q),
  );
}

/** Stored on `Transaction.message`; balance history uses this for the Bill Payment tag */
export const MOBILE_RECHARGE_MESSAGE_PREFIX = "Mobile recharge" as const;

export function rechargeMessage(plan: RechargePlan): string {
  return `${MOBILE_RECHARGE_MESSAGE_PREFIX} ₹${plan.price} — ${plan.validity} — ${plan.data}`;
}
