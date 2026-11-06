import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assertSafeExternalUrl } from "@/lib/ai/tools/url-safety";

export type PortalSnapshotResult = {
  title: string;
  url: string;
  screenshotPath: string | null;
  screenshotDataUrl?: string;
  textExcerpt?: string;
  engine:
    | "playwright-remote"
    | "playwright-chromium"
    | "playwright-msedge"
    | "playwright-chrome"
    | "firecrawl-fallback";
};

function sanitizeSnapshotFilename(name?: string): string {
  const base = path
    .basename(name || `portal_check_${Date.now()}.png`)
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  return base.toLowerCase().endsWith(".png") ? base : `${base}.png`;
}

export function isPlaywrightConfigured(): boolean {
  return true;
}

/**
 * 3. خدمة Playwright لأتمتة المتصفح وفحص المواقع أو البوابات بأمان
 */
export async function capturePortalSnapshot(
  url: string,
  opts?: {
    outputFilename?: string;
    includeDataUrl?: boolean;
    timeoutMs?: number;
  },
): Promise<PortalSnapshotResult> {
  const safeUrl = assertSafeExternalUrl(url).toString();
  const timeoutMs = opts?.timeoutMs ?? 25_000;
  const includeDataUrl = opts?.includeDataUrl ?? false;

  const snapshotDir = path.join(os.tmpdir(), "twinforge-snapshots");
  const filename = sanitizeSnapshotFilename(opts?.outputFilename);
  const fullOutputPath = path.join(snapshotDir, filename);

  const wsEndpoint =
    process.env.PLAYWRIGHT_WS_ENDPOINT || process.env.BROWSERLESS_WS_ENDPOINT;

  try {
    const { chromium } = await import("playwright-core");

    let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
    let engine: PortalSnapshotResult["engine"] = "playwright-chromium";

    if (wsEndpoint) {
      engine = "playwright-remote";
      browser = wsEndpoint.startsWith("http")
        ? await chromium.connectOverCDP(wsEndpoint, { timeout: timeoutMs })
        : await chromium.connect(wsEndpoint, { timeout: timeoutMs });
    } else {
      const launchCandidates: Array<{
        channel?: "msedge" | "chrome";
        engine: PortalSnapshotResult["engine"];
      }> = [
        { engine: "playwright-chromium" },
        { channel: "msedge", engine: "playwright-msedge" },
        { channel: "chrome", engine: "playwright-chrome" },
      ];

      let lastLaunchErr: unknown;
      for (const candidate of launchCandidates) {
        try {
          browser = await chromium.launch({
            headless: true,
            channel: candidate.channel,
          });
          engine = candidate.engine;
          break;
        } catch (err) {
          lastLaunchErr = err;
        }
      }

      if (!browser) {
        throw lastLaunchErr instanceof Error
          ? lastLaunchErr
          : new Error("لم يتم العثور على متصفح Chromium/Edge/Chrome محلي");
      }
    }

    try {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
      });
      const page = await context.newPage();

      try {
        await page.goto(safeUrl, {
          waitUntil: "networkidle",
          timeout: Math.min(timeoutMs, 18_000),
        });
      } catch {
        // بعض البوابات تبقي اتصالات تحليلية مفتوحة — نكمل بعد تحميل DOM
        await page.goto(safeUrl, {
          waitUntil: "domcontentloaded",
          timeout: timeoutMs,
        });
      }

      const buffer = await page.screenshot({ fullPage: true, type: "png" });
      const title = (await page.title()) || safeUrl;
      const textExcerpt = await page
        .evaluate(() =>
          (document.body?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 1500),
        )
        .catch(() => "");

      let savedPath: string | null = null;
      try {
        await fs.mkdir(snapshotDir, { recursive: true });
        await fs.writeFile(fullOutputPath, buffer);
        savedPath = fullOutputPath;
      } catch {
        savedPath = null;
      }

      return {
        title,
        url: page.url() || safeUrl,
        screenshotPath: savedPath,
        screenshotDataUrl: includeDataUrl
          ? `data:image/png;base64,${buffer.toString("base64")}`
          : undefined,
        textExcerpt,
        engine,
      };
    } finally {
      await browser.close().catch(() => undefined);
    }
  } catch (playwrightErr) {
    // في بيئات Serverless بدون متصفح محلي، نستخدم Firecrawl كبديل احتياطي إن توفر المفتاح
    const firecrawlKey = process.env.FIRECRAWL_API_KEY;
    if (firecrawlKey) {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firecrawlKey}`,
        },
        body: JSON.stringify({
          url: safeUrl,
          formats: ["markdown", "screenshot@fullPage"],
        }),
      });

      if (res.ok) {
        const json = (await res.json()) as {
          data?: {
            screenshot?: string;
            markdown?: string;
            metadata?: { title?: string; sourceURL?: string };
          };
        };
        return {
          title: json.data?.metadata?.title || safeUrl,
          url: json.data?.metadata?.sourceURL || safeUrl,
          screenshotPath: json.data?.screenshot || null,
          screenshotDataUrl: includeDataUrl ? json.data?.screenshot : undefined,
          textExcerpt: (json.data?.markdown || "").slice(0, 1500),
          engine: "firecrawl-fallback",
        };
      }
    }

    throw playwrightErr instanceof Error
      ? playwrightErr
      : new Error("تعذر التقاط صورة البوابة عبر Playwright");
  }
}
