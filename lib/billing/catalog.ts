export type PlanSku = "starter" | "pro" | "vip" | "syndicate";
export type TopupSku = "gold_100" | "gold_500" | "gold_1500" | "gold_5000";
export type BillingSku = PlanSku | TopupSku;

export type CatalogItem = {
  sku: BillingSku;
  kind: "subscription" | "topup";
  name: string;
  description: string;
  priceUsd: number;
  forgeGold: number;
  planName?: PlanSku;
};

export const BILLING_CATALOG: Record<BillingSku, CatalogItem> = {
  starter: {
    sku: "starter",
    kind: "subscription",
    name: "باقة البداية",
    description: "ساعتان ليليتان · استدلال يومي محدود",
    priceUsd: 19,
    forgeGold: 50,
    planName: "starter",
  },
  pro: {
    sku: "pro",
    kind: "subscription",
    name: "باقة المحترفين",
    description: "6 ساعات ليلية · استدلال أعلى",
    priceUsd: 49,
    forgeGold: 150,
    planName: "pro",
  },
  vip: {
    sku: "vip",
    kind: "subscription",
    name: "باقة النخبة",
    description: "12 ساعة ليلية · أولوية تنفيذ",
    priceUsd: 149,
    forgeGold: 500,
    planName: "vip",
  },
  syndicate: {
    sku: "syndicate",
    kind: "subscription",
    name: "باقة الشركات",
    description: "24 ساعة · حد استدلال مؤسسي",
    priceUsd: 499,
    forgeGold: 2000,
    planName: "syndicate",
  },
  gold_100: {
    sku: "gold_100",
    kind: "topup",
    name: "شحن 100 ForgeGold",
    description: "حزمة ذهب للمبتدئين",
    priceUsd: 9,
    forgeGold: 100,
  },
  gold_500: {
    sku: "gold_500",
    kind: "topup",
    name: "شحن 500 ForgeGold",
    description: "حزمة ذهب متوسطة",
    priceUsd: 39,
    forgeGold: 500,
  },
  gold_1500: {
    sku: "gold_1500",
    kind: "topup",
    name: "شحن 1500 ForgeGold",
    description: "حزمة ذهب كبيرة",
    priceUsd: 99,
    forgeGold: 1500,
  },
  gold_5000: {
    sku: "gold_5000",
    kind: "topup",
    name: "شحن 5000 ForgeGold",
    description: "حزمة ذهب سيادية",
    priceUsd: 299,
    forgeGold: 5000,
  },
};

export function getCatalogItem(sku: string): CatalogItem | null {
  return BILLING_CATALOG[sku as BillingSku] || null;
}
