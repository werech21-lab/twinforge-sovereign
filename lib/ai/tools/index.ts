import {
  type ClaudeToolSchema,
  type ComposioActionSlug,
  type ComposioExecutionResult,
  executeComposioAction,
  getComposioToolsForClaude,
  isComposioConfigured,
} from "@/lib/ai/tools/composio";
import {
  type CompetitorMenuItem,
  type FirecrawlMenuScrapeResult,
  isFirecrawlConfigured,
  scrapeCompetitorMenu,
} from "@/lib/ai/tools/firecrawl";
import {
  analyzeMarketWithPerplexity,
  DEFAULT_KUWAIT_RESTAURANT_ANALYST_PROMPT,
  isPerplexityConfigured,
  type PerplexityCitation,
  type PerplexityMarketResult,
} from "@/lib/ai/tools/perplexity";
import {
  capturePortalSnapshot,
  isPlaywrightConfigured,
  type PortalSnapshotResult,
} from "@/lib/ai/tools/playwright";
import {
  assertSafeExternalUrl,
  extractUrlsFromText,
} from "@/lib/ai/tools/url-safety";

export {
  analyzeMarketWithPerplexity,
  assertSafeExternalUrl,
  capturePortalSnapshot,
  DEFAULT_KUWAIT_RESTAURANT_ANALYST_PROMPT,
  executeComposioAction,
  extractUrlsFromText,
  getComposioToolsForClaude,
  isComposioConfigured,
  isFirecrawlConfigured,
  isPerplexityConfigured,
  isPlaywrightConfigured,
  scrapeCompetitorMenu,
};

export type {
  ClaudeToolSchema,
  CompetitorMenuItem,
  ComposioActionSlug,
  ComposioExecutionResult,
  FirecrawlMenuScrapeResult,
  PerplexityCitation,
  PerplexityMarketResult,
  PortalSnapshotResult,
};

export type AgentServiceStatus = {
  id: "perplexity" | "firecrawl" | "playwright" | "composio";
  name: string;
  configured: boolean;
  mode: string;
};

export function getAgentToolsStatus(): AgentServiceStatus[] {
  const hasRemoteBrowser = Boolean(
    process.env.PLAYWRIGHT_WS_ENDPOINT || process.env.BROWSERLESS_WS_ENDPOINT,
  );
  return [
    {
      id: "perplexity",
      name: "Perplexity (sonar-pro)",
      configured: isPerplexityConfigured(),
      mode: isPerplexityConfigured() ? "ready" : "missing_api_key",
    },
    {
      id: "firecrawl",
      name: "Firecrawl Menu Scraper",
      configured: isFirecrawlConfigured(),
      mode: isFirecrawlConfigured() ? "ready" : "missing_api_key",
    },
    {
      id: "playwright",
      name: "Playwright Portal Inspector",
      configured: isPlaywrightConfigured(),
      mode: hasRemoteBrowser ? "remote_ws" : "local_browser",
    },
    {
      id: "composio",
      name: "Composio (Gmail / Sheets / Slack)",
      configured: isComposioConfigured(),
      mode: isComposioConfigured() ? "ready" : "missing_api_key",
    },
  ];
}

/**
 * يعيد قائمة الأدوات المهيأة بصيغة Claude Tool Use شاملة الخدمات الأربع.
 */
export function getAllClaudeTools(opts?: {
  allowExternalMutations?: boolean;
}): ClaudeToolSchema[] {
  const tools: ClaudeToolSchema[] = [];

  if (isPerplexityConfigured()) {
    tools.push({
      name: "perplexity_market_research",
      description:
        "بحث وتحليل سوقي مدعوم بالمصادر والأرقام عبر Perplexity sonar-pro (متخصص في أسواق المطاعم والأعمال في الكويت والخليج).",
      input_schema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "سؤال البحث أو التحليل السوقي المطلوب",
          },
        },
        required: ["query"],
      },
    });
  }

  if (isFirecrawlConfigured()) {
    tools.push({
      name: "firecrawl_scrape_menu",
      description:
        "سحب قوائم الطعام وأسعار المنافسين بالدينار الكويتي (KWD) بصيغة منظمة عبر Firecrawl.",
      input_schema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "رابط صفحة قائمة المنافس أو الموقع المراد استخراج أسعاره",
          },
          prompt: {
            type: "string",
            description: "تعليمات استخراج إضافية اختيارية",
          },
        },
        required: ["url"],
      },
    });
  }

  tools.push({
    name: "playwright_portal_snapshot",
    description:
      "فتح موقع أو بوابة إلكترونية عبر متصفح Playwright والتقاط عنوان الصفحة ولقطة شاشة ومقتطف نصي للتحقق من حالتها.",
    input_schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "رابط الموقع أو البوابة المراد فحصها",
        },
      },
      required: ["url"],
    },
  });

  if (isComposioConfigured() && opts?.allowExternalMutations) {
    tools.push(
      ...getComposioToolsForClaude([
        "GMAIL_SEND_EMAIL",
        "GOOGLESHEETS_BATCH_UPDATE",
        "SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL",
      ]),
    );
  }

  return tools;
}

export type ToolDispatchOutput = {
  toolName: string;
  summaryText: string;
  rawResult: unknown;
  citations?: string[];
  estimatedCostUsd: number;
};

/**
 * ينفذ أداة بالاسم ويعيد مخرجاً نصياً منظماً لتمريره إلى النموذج أو واجهة API.
 */
export async function executeAgentToolByName(
  toolName: string,
  args: Record<string, unknown>,
  opts?: {
    allowExternalMutations?: boolean;
    userId?: string;
  },
): Promise<ToolDispatchOutput> {
  if (toolName === "perplexity_market_research") {
    const query = String(args.query || "").trim();
    const res = await analyzeMarketWithPerplexity(query, {
      systemPrompt:
        typeof args.systemPrompt === "string" ? args.systemPrompt : undefined,
    });
    const citationUrls = res.citations.map((c) => c.url);
    const sourcesBlock =
      citationUrls.length > 0
        ? `\n\nالمصادر:\n${res.citations
            .map((c, idx) => `[${idx + 1}] ${c.title ? `${c.title} — ` : ""}${c.url}`)
            .join("\n")}`
        : "";

    return {
      toolName,
      summaryText: `${res.answer}${sourcesBlock}`,
      rawResult: res,
      citations: citationUrls,
      estimatedCostUsd: res.estimatedCostUsd,
    };
  }

  if (toolName === "firecrawl_scrape_menu") {
    const url = String(args.url || "").trim();
    const res = await scrapeCompetitorMenu(url, {
      prompt: typeof args.prompt === "string" ? args.prompt : undefined,
    });
    const itemLines =
      res.items.length > 0
        ? res.items
            .slice(0, 50)
            .map(
              (it) =>
                `- [${it.category}] ${it.item_name}: ${
                  it.price_kwd !== null
                    ? `${it.price_kwd.toFixed(3)} د.ك`
                    : it.price_text || "غير محدد"
                }`,
            )
            .join("\n")
        : "لم يتم العثور على عناصر قائمة مهيكلة، نورد ملخص الصفحة أدناه.";

    return {
      toolName,
      summaryText: `نتيجة سحب القائمة من (${res.url}):\nالعنوان: ${
        res.restaurantName || res.metadata.title || "غير معنون"
      }\nعدد الأصناف المستخرجة: ${res.items.length}\n${itemLines}\n\nمقتطف المحتوى:\n${res.markdown.slice(0, 2500)}`,
      rawResult: res,
      citations: [res.url],
      estimatedCostUsd: res.estimatedCostUsd,
    };
  }

  if (toolName === "playwright_portal_snapshot") {
    const url = String(args.url || "").trim();
    const res = await capturePortalSnapshot(url, {
      outputFilename:
        typeof args.outputFilename === "string"
          ? args.outputFilename
          : undefined,
      includeDataUrl: Boolean(args.includeDataUrl),
    });

    return {
      toolName,
      summaryText: `فحص البوابة عبر Playwright (${res.engine}):\n- الرابط: ${res.url}\n- عنوان الصفحة: ${res.title}\n- مسار اللقطة: ${res.screenshotPath || "ذاكرة مؤقتة"}\n- مقتطف النص الظاهر:\n${res.textExcerpt || "(لا يوجد نص ظاهر)"}`,
      rawResult: res,
      citations: [res.url],
      estimatedCostUsd: 0.002,
    };
  }

  // أدوات Composio الخارجية (تتطلب سماحاً صريحاً بالتنفيذ الخارجي)
  const upperName = toolName.trim().toUpperCase();
  if (
    upperName.startsWith("GMAIL_") ||
    upperName.startsWith("GOOGLESHEETS_") ||
    upperName.startsWith("SLACK_")
  ) {
    if (!opts?.allowExternalMutations) {
      throw new Error(
        `الإجراء الخارجي (${upperName}) يتطلب موافقة صريحة من مالك التوأم قبل التنفيذ`,
      );
    }

    const res = await executeComposioAction(upperName, args, {
      userId: opts?.userId,
    });

    return {
      toolName: upperName,
      summaryText: `تم تنفيذ إجراء Composio (${upperName}) بنجاح=${res.successful}: ${JSON.stringify(res.data).slice(0, 1200)}`,
      rawResult: res,
      estimatedCostUsd: 0.002,
    };
  }

  throw new Error(`أداة غير معروفة: ${toolName}`);
}

const MARKET_RESEARCH_KEYWORDS =
  /سوق|أسواق|مطعم|مطاعم|منافس|منافسين|أسعار|الكويت|الخليج|حصة سوقية|تحليل سوق|market|competitor|restaurant|kuwait|gulf|kwd|دينار/i;
const MENU_SCRAPE_KEYWORDS =
  /منيو|قائمة|قوائم|أصناف|أسعار|سحب|استخراج|menu|scrape|price|talabat|deliveroo|jahez/i;
const PORTAL_SNAPSHOT_KEYWORDS =
  /بوابة|فحص موقع|لقطة|شاشة|متصفح|تأكد من الموقع|portal|snapshot|screenshot|playwright|check site|inspect/i;

/**
 * يجمع بيانات حية تلقائياً للمهمة عبر الخدمات المتاحة (Firecrawl / Playwright / Perplexity)
 * لتزويد محرك التوأم بحقائق ومصادر حقيقية قبل صياغة المخرج النهائي.
 */
export async function gatherTaskToolContext(input: {
  title: string;
  description: string | null;
}): Promise<{
  contextText: string;
  toolsUsed: string[];
  citations: string[];
  estimatedCostUsd: number;
}> {
  const combinedText = `${input.title}\n${input.description || ""}`.trim();
  const urls = extractUrlsFromText(combinedText);

  const blocks: string[] = [];
  const toolsUsed: string[] = [];
  const citations = new Set<string>();
  let estimatedCostUsd = 0;

  const targetUrl = urls[0];

  if (targetUrl) {
    const wantsMenu = MENU_SCRAPE_KEYWORDS.test(combinedText);
    const wantsPortal = PORTAL_SNAPSHOT_KEYWORDS.test(combinedText);

    if (wantsMenu && isFirecrawlConfigured()) {
      try {
        const scraped = await executeAgentToolByName("firecrawl_scrape_menu", {
          url: targetUrl,
        });
        blocks.push(`### [Firecrawl] بيانات قائمة المنافس\n${scraped.summaryText}`);
        toolsUsed.push("firecrawl");
        scraped.citations?.forEach((u) => citations.add(u));
        estimatedCostUsd += scraped.estimatedCostUsd;
      } catch (err) {
        console.warn("Firecrawl auto-tool skipped on error:", err);
      }
    } else if (wantsPortal || !isFirecrawlConfigured()) {
      try {
        const snap = await executeAgentToolByName(
          "playwright_portal_snapshot",
          { url: targetUrl },
        );
        blocks.push(`### [Playwright] فحص الموقع المباشر\n${snap.summaryText}`);
        toolsUsed.push("playwright");
        snap.citations?.forEach((u) => citations.add(u));
        estimatedCostUsd += snap.estimatedCostUsd;
      } catch (err) {
        console.warn("Playwright auto-tool skipped on error:", err);
      }
    } else if (isFirecrawlConfigured()) {
      try {
        const scraped = await executeAgentToolByName("firecrawl_scrape_menu", {
          url: targetUrl,
        });
        blocks.push(`### [Firecrawl] استخراج محتوى الرابط\n${scraped.summaryText}`);
        toolsUsed.push("firecrawl");
        scraped.citations?.forEach((u) => citations.add(u));
        estimatedCostUsd += scraped.estimatedCostUsd;
      } catch (err) {
        console.warn("Firecrawl fallback skipped on error:", err);
      }
    }
  }

  if (isPerplexityConfigured() && MARKET_RESEARCH_KEYWORDS.test(combinedText)) {
    try {
      const research = await executeAgentToolByName(
        "perplexity_market_research",
        { query: combinedText },
      );
      blocks.push(
        `### [Perplexity sonar-pro] بحث وتحليل السوق\n${research.summaryText}`,
      );
      toolsUsed.push("perplexity");
      research.citations?.forEach((u) => citations.add(u));
      estimatedCostUsd += research.estimatedCostUsd;
    } catch (err) {
      console.warn("Perplexity auto-tool skipped on error:", err);
    }
  }

  return {
    contextText: blocks.join("\n\n"),
    toolsUsed,
    citations: Array.from(citations),
    estimatedCostUsd,
  };
}
