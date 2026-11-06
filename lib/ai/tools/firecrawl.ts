import { assertSafeExternalUrl } from "@/lib/ai/tools/url-safety";

export type CompetitorMenuItem = {
  item_name: string;
  category: string;
  price_kwd: number | null;
  price_text?: string;
  description?: string;
};

export type FirecrawlMenuScrapeResult = {
  url: string;
  restaurantName?: string;
  items: CompetitorMenuItem[];
  markdown: string;
  metadata: {
    title?: string;
    description?: string;
    sourceURL?: string;
  };
  estimatedCostUsd: number;
};

const MENU_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    restaurant_name: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          item_name: { type: "string" },
          category: { type: "string" },
          price_kwd: { type: "number" },
          price_text: { type: "string" },
          description: { type: "string" },
        },
        required: ["item_name"],
      },
    },
  },
  required: ["items"],
};

export function isFirecrawlConfigured(): boolean {
  return Boolean(process.env.FIRECRAWL_API_KEY);
}

/**
 * 2. خدمة Firecrawl لسحب قوائم وأسعار المنافسين بصيغة نظيفة (بالدينار الكويتي KWD)
 */
export async function scrapeCompetitorMenu(
  url: string,
  opts?: {
    prompt?: string;
    timeoutMs?: number;
  },
): Promise<FirecrawlMenuScrapeResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("مفتاح FIRECRAWL_API_KEY غير مضبوط في متغيرات البيئة");
  }

  const safeUrl = assertSafeExternalUrl(url).toString();
  const prompt =
    opts?.prompt ||
    "Extract all menu items with item_name, category, and price in KWD.";
  const timeoutMs = opts?.timeoutMs ?? 35_000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: safeUrl,
        formats: [
          "markdown",
          {
            type: "json",
            prompt,
            schema: MENU_EXTRACTION_SCHEMA,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Firecrawl ${res.status}: ${errBody.slice(0, 300)}`);
    }

    const payload = (await res.json()) as {
      success?: boolean;
      data?: {
        markdown?: string;
        json?: {
          restaurant_name?: string;
          items?: Array<Record<string, unknown>>;
        };
        extract?: {
          restaurant_name?: string;
          items?: Array<Record<string, unknown>>;
        };
        metadata?: {
          title?: string;
          description?: string;
          sourceURL?: string;
        };
      };
    };

    const data = payload.data || {};
    const extracted = data.json || data.extract || {};
    const rawItems = Array.isArray(extracted.items) ? extracted.items : [];

    const items: CompetitorMenuItem[] = rawItems
      .map((item): CompetitorMenuItem | null => {
        const name = String(item.item_name || item.name || "").trim();
        if (!name) return null;

        const rawNumeric =
          typeof item.price_kwd === "number"
            ? item.price_kwd
            : typeof item.price === "number"
              ? item.price
              : Number.parseFloat(
                  String(item.price_kwd ?? item.price ?? "").replace(
                    /[^\d.]/g,
                    "",
                  ),
                );

        return {
          item_name: name,
          category: String(item.category || "عام").trim(),
          price_kwd: Number.isFinite(rawNumeric) ? rawNumeric : null,
          price_text:
            typeof item.price_text === "string"
              ? item.price_text
              : typeof item.price === "string"
                ? item.price
                : undefined,
          description:
            typeof item.description === "string" ? item.description : undefined,
        };
      })
      .filter((x): x is CompetitorMenuItem => x !== null);

    return {
      url: safeUrl,
      restaurantName:
        typeof extracted.restaurant_name === "string"
          ? extracted.restaurant_name
          : data.metadata?.title,
      items,
      markdown: (data.markdown || "").slice(0, 12_000),
      metadata: {
        title: data.metadata?.title,
        description: data.metadata?.description,
        sourceURL: data.metadata?.sourceURL || safeUrl,
      },
      estimatedCostUsd: 0.01,
    };
  } finally {
    clearTimeout(timer);
  }
}
