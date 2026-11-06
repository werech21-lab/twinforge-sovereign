"""
External AI & Automation Tools for Kuwait Restaurant Operations.

Integrates:
1. Perplexity (`sonar-pro` via OpenAI-compatible API) — Kuwait market trends,
   weather/event demand impact, and wholesale ingredient inflation.
2. Firecrawl (`firecrawl-py`) — Structured competitor menu & KWD pricing scraper
   with Menu Engineering Matrix comparison.
3. Playwright (`playwright`) — Thread-safe headless browser utility for automated
   dashboard health screenshots and delivery aggregator portal checks.
4. Composio (`composio` + `composio-anthropic` + `anthropic`) — Multi-app action
   dispatcher (Gmail, Google Sheets, Slack, WhatsApp) wired to Claude.

Every service gracefully falls back to a clearly labeled `demo` mode when API
keys are not yet configured in `.env`.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import ipaddress
import json
import os
from pathlib import Path
import re
import time
from typing import Any, Literal
from urllib.parse import urlparse

from dotenv import load_dotenv
import pandas as pd

# Load .env and .env.local (without overriding explicit process env vars)
load_dotenv(".env", override=False)
load_dotenv(".env.local", override=False)

MarketFocus = Literal["trends", "weather_events", "inflation"]
ComposioChannel = Literal["gmail", "googlesheets", "slack", "whatsapp"]

SNAPSHOT_DIR = Path("snapshots")

PERPLEXITY_SYSTEM_PROMPTS: dict[MarketFocus, str] = {
    "trends": (
        "You are a senior Kuwait & GCC restaurant market analyst. Provide concise, "
        "evidence-backed insights with concrete numbers, KWD price benchmarks (3 decimals), "
        "delivery channel shares (Talabat, Deliveroo, Jahez, Cari), and cited sources."
    ),
    "weather_events": (
        "You are a Kuwait restaurant demand forecaster specializing in weather anomalies "
        "(extreme heat, dust storms, humidity) and calendar events (payday weeks, Ramadan, "
        "weekend kashta/chalet catering, national holidays). Quantify expected dine-in vs. "
        "delivery order shifts with sources."
    ),
    "inflation": (
        "You are a Kuwait F&B procurement & food-cost analyst tracking Shuwaikh wholesale "
        "and GCC import price movements in KWD across poultry, beef, dairy, cooking oils, "
        "produce, packaging, and specialty coffee. Cite recent figures and margin mitigations."
    ),
}

COMPOSIO_ACTION_SLUGS: dict[ComposioChannel, str] = {
    "gmail": "GMAIL_SEND_EMAIL",
    "googlesheets": "GOOGLESHEETS_BATCH_UPDATE",
    "slack": "SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL",
    "whatsapp": "WHATSAPP_SEND_MESSAGE",
}


def _has_key(env_name: str) -> bool:
    val = (os.getenv(env_name) or "").strip()
    return bool(val) and not val.lower().startswith("your-")


def get_integrations_status() -> dict[str, dict[str, Any]]:
    """Return live vs. demo readiness for all four external integrations."""
    has_pplx = _has_key("PERPLEXITY_API_KEY")
    has_fc = _has_key("FIRECRAWL_API_KEY")
    has_comp = _has_key("COMPOSIO_API_KEY")
    has_claude = _has_key("ANTHROPIC_API_KEY")

    return {
        "perplexity": {
            "label": "Perplexity (sonar-pro)",
            "live": has_pplx,
            "mode": "LIVE API" if has_pplx else "DEMO FALLBACK",
            "env_var": "PERPLEXITY_API_KEY",
        },
        "firecrawl": {
            "label": "Firecrawl Scraper",
            "live": has_fc,
            "mode": "LIVE API" if has_fc else "DEMO FALLBACK",
            "env_var": "FIRECRAWL_API_KEY",
        },
        "playwright": {
            "label": "Playwright Headless",
            "live": True,
            "mode": "LOCAL HEADLESS",
            "env_var": "PLAYWRIGHT_WS_ENDPOINT (optional)",
        },
        "composio": {
            "label": "Composio + Claude",
            "live": has_comp,
            "claude_ready": has_claude,
            "mode": (
                "LIVE AGENT"
                if (has_comp and has_claude)
                else ("LIVE DIRECT" if has_comp else "DEMO DRY-RUN")
            ),
            "env_var": "COMPOSIO_API_KEY / ANTHROPIC_API_KEY",
        },
    }


def validate_target_url(raw_url: str, *, allow_localhost: bool = False) -> str:
    """Validate HTTP(S) URL and block private/internal SSRF targets unless permitted."""
    cleaned = (raw_url or "").strip()
    parsed = urlparse(cleaned)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError(f"Invalid URL '{raw_url}'. Must start with http:// or https://.")

    host = parsed.hostname.lower()
    local_hosts = {"localhost", "127.0.0.1", "::1"}
    if host in local_hosts:
        if allow_localhost:
            return cleaned
        raise ValueError("Localhost URLs are restricted for external scraping.")

    if host in {"0.0.0.0", "metadata.google.internal"} or host.endswith(
        (".local", ".internal")
    ):
        raise ValueError(f"Blocked internal hostname: {host}")

    try:
        ip = ipaddress.ip_address(host)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            raise ValueError(f"Blocked private network address: {host}")
    except ValueError as exc:
        if "Blocked" in str(exc):
            raise

    return cleaned


# ============================================================================
# 1. Perplexity (`sonar-pro`) — Market, Weather/Event & Ingredient Inflation
# ============================================================================


def _demo_perplexity_response(query: str, focus: MarketFocus) -> dict[str, Any]:
    templates: dict[MarketFocus, tuple[str, list[dict[str, str]]]] = {
        "trends": (
            f"**Kuwait F&B Market Snapshot (Demo Mode)** — Query: *{query}*\n\n"
            "- **Average Check & Pricing**: Casual burger & fast-casual concepts in Kuwait City, "
            "Salmiya, and Ardiya cluster around **2.650–3.450 KWD** for signature mains and "
            "**3.950–4.750 KWD** for combo meals.\n"
            "- **Aggregator Mix**: Delivery accounts for **58%–66%** of daily orders in QSR/fast-casual; "
            "high-margin add-ons (loaded fries at **1.450 KWD**, specialty iced drinks at **1.650 KWD**) "
            "offset 18%–25% aggregator commissions.\n"
            "- **Menu Engineering Signal**: Bundled sharing boxes (**8.500–11.900 KWD**) show 22% higher "
            "Thursday–Saturday evening conversion across family districts.",
            [
                {
                    "title": "Kuwait CSB Consumer & Hospitality Price Bulletin (Benchmark)",
                    "url": "https://www.csb.gov.kw",
                },
                {
                    "title": "GCC Foodservice & Delivery Aggregator Economics Report",
                    "url": "https://www.statista.com/outlook/dmo/online-food-delivery/kuwait",
                },
            ],
        ),
        "weather_events": (
            f"**Weather & Calendar Demand Forecast (Demo Mode)** — Query: *{query}*\n\n"
            "- **Heat / Dust Anomaly Impact**: When daytime temperatures exceed **44°C** or visibility drops "
            "below 2,000m during dust warnings, dine-in footfall typically contracts **-24% to -35%**, while "
            "delivery orders surge **+19% to +28%** between 18:30 and 23:30.\n"
            "- **Payday & Weekend Lift**: Kuwait public-sector salary disbursement dates (22nd–26th) lift "
            "average ticket size by **+0.450 KWD (+12.4%)**, favoring premium proteins and family platters.\n"
            "- **Operational Action**: Shift 1 kitchen prep station to delivery packaging 45 minutes prior "
            "to peak evening dispatch and promote cold beverages (**+76% contribution margin**).",
            [
                {
                    "title": "Kuwait Directorate General of Civil Aviation — Weather Advisories",
                    "url": "https://www.met.gov.kw",
                },
                {
                    "title": "MENA QSR Delivery Peak-Hour Elasticity Study",
                    "url": "https://www.mckinsey.com/industries/retail/our-insights",
                },
            ],
        ),
        "inflation": (
            f"**Kuwait Ingredient & Food-Cost Inflation Watch (Demo Mode)** — Query: *{query}*\n\n"
            "- **Proteins (Chilled Beef & Poultry)**: Imported chilled brisket/chuck blends average "
            "**2.850–3.350 KWD/kg** wholesale (+6.2% YoY); GCC chilled poultry breast holds steady near "
            "**1.180–1.320 KWD/kg**.\n"
            "- **Dairy, Oils & Coffee**: Frying shortening & high-oleic oils rose **+4.8%**, while specialty "
            "Arabica green/roasted beans increased **+11.5%**, pressuring café beverage COGS by **0.035–0.060 KWD/cup**.\n"
            "- **Margin Mitigation**: Re-portioning fries from 180g to 155g with seasoned dip upsell (**+0.350 KWD**) "
            "recovers **1.9 percentage points** of blended gross margin without menu sticker shock.",
            [
                {
                    "title": "Kuwait Central Statistical Bureau — Food & Beverage CPI",
                    "url": "https://www.csb.gov.kw",
                },
                {
                    "title": "FAO Global Food Price & Dairy/Meat Commodity Index",
                    "url": "https://www.fao.org/worldfoodsituation/foodpricesindex/en/",
                },
            ],
        ),
    }
    answer, citations = templates.get(focus, templates["trends"])
    return {
        "mode": "demo",
        "model": "sonar-pro (demo-fallback)",
        "focus": focus,
        "query": query,
        "answer": answer,
        "citations": citations,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def query_kuwait_market_intel(
    query: str,
    focus: MarketFocus = "trends",
    model: str = "sonar-pro",
) -> dict[str, Any]:
    """
    1. Query Perplexity `sonar-pro` via the OpenAI-compatible SDK for live Kuwait
    restaurant intelligence, weather/event demand impact, or ingredient inflation.
    """
    clean_query = (query or "").strip()
    if not clean_query:
        raise ValueError("Market intelligence query cannot be empty.")

    api_key = (os.getenv("PERPLEXITY_API_KEY") or "").strip()
    if not api_key:
        return _demo_perplexity_response(clean_query, focus)

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key, base_url="https://api.perplexity.ai")
        system_prompt = PERPLEXITY_SYSTEM_PROMPTS.get(
            focus, PERPLEXITY_SYSTEM_PROMPTS["trends"]
        )
        response = client.chat.completions.create(
            model=model,
            temperature=0.2,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": clean_query},
            ],
        )

        answer = (response.choices[0].message.content or "").strip()
        raw_dump = response.model_dump() if hasattr(response, "model_dump") else {}

        citations: list[dict[str, str]] = []
        seen_urls: set[str] = set()

        # Parse structured annotations (Perplexity 2025/2026 schema)
        annotations = list(raw_dump.get("annotations") or [])
        msg_ann = (
            raw_dump.get("choices", [{}])[0]
            .get("message", {})
            .get("annotations")
            or []
        )
        for item in [*annotations, *msg_ann]:
            cite = (item or {}).get("url_citation") or {}
            url = cite.get("url")
            if url and url not in seen_urls:
                seen_urls.add(url)
                citations.append(
                    {"title": cite.get("title") or url, "url": url}
                )

        # Fallback to flat citations array if present
        for url in raw_dump.get("citations") or []:
            if isinstance(url, str) and url not in seen_urls:
                seen_urls.add(url)
                citations.append({"title": url, "url": url})

        return {
            "mode": "live",
            "model": response.model or model,
            "focus": focus,
            "query": clean_query,
            "answer": answer,
            "citations": citations,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        demo = _demo_perplexity_response(clean_query, focus)
        demo["mode"] = "fallback"
        demo["fallback_reason"] = str(exc)
        return demo


# ============================================================================
# 2. Firecrawl — Competitor Menu Scraper & Menu Engineering Price Comparator
# ============================================================================

MENU_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "restaurant_name": {"type": "string"},
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "item_name": {"type": "string"},
                    "category": {"type": "string"},
                    "price_kwd": {"type": "number"},
                    "description": {"type": "string"},
                },
                "required": ["item_name", "price_kwd"],
            },
        },
    },
    "required": ["items"],
}


def get_default_menu_engineering_df() -> pd.DataFrame:
    """Baseline Menu Engineering Matrix for our Kuwait restaurant concept."""
    rows = [
        {
            "item_name": "Double Wagyu Smash Burger",
            "category": "Burgers",
            "our_price_kwd": 2.950,
            "food_cost_kwd": 0.890,
            "weekly_units": 420,
            "quadrant": "Star",
        },
        {
            "item_name": "Crispy Nashville Chicken Slider",
            "category": "Burgers",
            "our_price_kwd": 2.450,
            "food_cost_kwd": 0.680,
            "weekly_units": 390,
            "quadrant": "Star",
        },
        {
            "item_name": "Truffle Parmesan Fries",
            "category": "Sides",
            "our_price_kwd": 1.450,
            "food_cost_kwd": 0.340,
            "weekly_units": 165,
            "quadrant": "Puzzle",
        },
        {
            "item_name": "Classic Salted Skin-On Fries",
            "category": "Sides",
            "our_price_kwd": 0.850,
            "food_cost_kwd": 0.310,
            "weekly_units": 510,
            "quadrant": "Plowhorse",
        },
        {
            "item_name": "Iced Spanish Latte (16oz)",
            "category": "Beverages",
            "our_price_kwd": 1.650,
            "food_cost_kwd": 0.360,
            "weekly_units": 340,
            "quadrant": "Star",
        },
        {
            "item_name": "Saffron Cardamom Milk Cake",
            "category": "Desserts",
            "our_price_kwd": 2.100,
            "food_cost_kwd": 0.520,
            "weekly_units": 95,
            "quadrant": "Puzzle",
        },
        {
            "item_name": "Grilled Halloumi Wrap",
            "category": "Wraps",
            "our_price_kwd": 1.850,
            "food_cost_kwd": 0.740,
            "weekly_units": 80,
            "quadrant": "Dog",
        },
    ]
    df = pd.DataFrame(rows)
    df["margin_kwd"] = (df["our_price_kwd"] - df["food_cost_kwd"]).round(3)
    df["food_cost_pct"] = ((df["food_cost_kwd"] / df["our_price_kwd"]) * 100).round(1)
    return df


def _demo_competitor_menu(url: str) -> dict[str, Any]:
    host = urlparse(url).hostname or "competitor.kw"
    brand = host.replace("www.", "").split(".")[0].replace("-", " ").title()
    items = [
        {
            "item_name": "Signature Double Smash Burger",
            "category": "Burgers",
            "price_kwd": 3.250,
            "description": "Two Angus smash patties, aged cheddar, house sauce, potato bun",
        },
        {
            "item_name": "Hot Honey Crispy Chicken Burger",
            "category": "Burgers",
            "price_kwd": 2.650,
            "description": "Southern fried chicken fillet, spicy honey glaze, pickles",
        },
        {
            "item_name": "Black Truffle Fries",
            "category": "Sides",
            "price_kwd": 1.850,
            "description": "Hand-cut fries, truffle oil, grated grana padano",
        },
        {
            "item_name": "House Seasoned Fries",
            "category": "Sides",
            "price_kwd": 0.950,
            "description": "Crispy skin-on fries with sea salt",
        },
        {
            "item_name": "Iced Spanish Latte",
            "category": "Beverages",
            "price_kwd": 1.750,
            "description": "Double espresso, condensed milk blend over ice",
        },
        {
            "item_name": "Saffron Tres Leches",
            "category": "Desserts",
            "price_kwd": 2.450,
            "description": "alkaff saffron sponge soaked in three milks",
        },
        {
            "item_name": "Halloumi Pesto Tortilla",
            "category": "Wraps",
            "price_kwd": 1.750,
            "description": "Seared Cyprus halloumi, sundried tomato, basil",
        },
    ]
    return {
        "mode": "demo",
        "url": url,
        "restaurant_name": f"{brand} Kitchen Kuwait (Demo Sample)",
        "items": items,
        "markdown_excerpt": (
            f"# {brand} Kitchen — Kuwait Menu\n"
            "Extracted benchmark menu in KWD (Demo mode — set `FIRECRAWL_API_KEY` in `.env` "
            "for live Firecrawl extraction)."
        ),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def scrape_competitor_menu(url: str) -> dict[str, Any]:
    """
    2. Scrape any restaurant/delivery URL via Firecrawl into clean menu items
    and 3-decimal KWD prices, with automatic demo fallback when unconfigured.
    """
    safe_url = validate_target_url(url, allow_localhost=False)
    api_key = (os.getenv("FIRECRAWL_API_KEY") or "").strip()
    if not api_key:
        return _demo_competitor_menu(safe_url)

    try:
        from firecrawl import Firecrawl

        app = Firecrawl(api_key=api_key)
        doc = app.scrape(
            safe_url,
            formats=[
                "markdown",
                {
                    "type": "json",
                    "prompt": (
                        "Extract all restaurant menu items with item_name, category, "
                        "price_kwd (numeric price in Kuwaiti Dinars KWD), and description."
                    ),
                    "schema": MENU_JSON_SCHEMA,
                },
            ],
        )

        raw = doc.model_dump() if hasattr(doc, "model_dump") else (doc if isinstance(doc, dict) else {})
        extracted = raw.get("json") or raw.get("extract") or {}
        if isinstance(extracted, str):
            try:
                extracted = json.loads(extracted)
            except json.JSONDecodeError:
                extracted = {}

        raw_items = extracted.get("items") if isinstance(extracted, dict) else []
        normalized_items: list[dict[str, Any]] = []
        for entry in raw_items or []:
            if not isinstance(entry, dict):
                continue
            name = str(entry.get("item_name") or entry.get("name") or "").strip()
            if not name:
                continue
            price_val = entry.get("price_kwd", entry.get("price"))
            parsed_price: float | None = None
            if isinstance(price_val, (int, float)):
                parsed_price = round(float(price_val), 3)
            elif isinstance(price_val, str):
                match = re.search(r"\d+(?:\.\d+)?", price_val)
                if match:
                    parsed_price = round(float(match.group(0)), 3)

            normalized_items.append(
                {
                    "item_name": name,
                    "category": str(entry.get("category") or "General").strip(),
                    "price_kwd": parsed_price,
                    "description": str(entry.get("description") or "").strip(),
                }
            )

        metadata = raw.get("metadata") or {}
        restaurant_name = (
            (extracted.get("restaurant_name") if isinstance(extracted, dict) else None)
            or metadata.get("title")
            or urlparse(safe_url).hostname
        )

        return {
            "mode": "live",
            "url": safe_url,
            "restaurant_name": str(restaurant_name),
            "items": normalized_items,
            "markdown_excerpt": str(raw.get("markdown") or "")[:3000],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        fallback = _demo_competitor_menu(safe_url)
        fallback["mode"] = "fallback"
        fallback["fallback_reason"] = str(exc)
        return fallback


def _token_overlap(a: str, b: str) -> float:
    stop = {"with", "and", "the", "our", "house", "classic", "iced", "hot"}
    ta = {t for t in re.findall(r"[a-z0-9]+", a.lower()) if len(t) > 2 and t not in stop}
    tb = {t for t in re.findall(r"[a-z0-9]+", b.lower()) if len(t) > 2 and t not in stop}
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def compare_with_menu_matrix(
    competitor_items: list[dict[str, Any]],
    our_menu_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Compare scraped competitor KWD items against our Menu Engineering Matrix,
    surfacing KWD price gaps and quadrant-specific pricing actions.
    """
    if our_menu_df.empty or not competitor_items:
        return pd.DataFrame()

    comp_valid = [
        it for it in competitor_items if isinstance(it.get("price_kwd"), (int, float))
    ]
    if not comp_valid:
        return pd.DataFrame()

    records: list[dict[str, Any]] = []
    for _, row in our_menu_df.iterrows():
        our_name = str(row["item_name"])
        our_cat = str(row["category"]).lower()
        our_price = float(row["our_price_kwd"])
        quadrant = str(row.get("quadrant", "Star"))

        # Score candidate matches by token similarity + category match bonus
        best_item: dict[str, Any] | None = None
        best_score = -1.0
        for cand in comp_valid:
            cand_cat = str(cand.get("category") or "").lower()
            cat_bonus = 0.35 if (our_cat and our_cat in cand_cat or cand_cat in our_cat) else 0.0
            score = _token_overlap(our_name, str(cand.get("item_name", ""))) + cat_bonus
            if score > best_score:
                best_score = score
                best_item = cand

        if not best_item:
            continue

        comp_price = float(best_item["price_kwd"])
        gap_kwd = round(our_price - comp_price, 3)  # negative => we are cheaper
        gap_pct = round(((our_price - comp_price) / comp_price) * 100, 1) if comp_price else 0.0

        if quadrant == "Star" and gap_kwd < -0.150:
            signal = f"Raise +{min(abs(gap_kwd) * 0.6, 0.250):.3f} KWD (Underpriced Star)"
        elif quadrant == "Puzzle" and gap_kwd < -0.150:
            signal = "Bundle in combo + highlight on aggregator hero"
        elif quadrant == "Plowhorse" and gap_kwd < -0.050:
            signal = f"Nudge +{min(abs(gap_kwd), 0.100):.3f} KWD (High-volume lift)"
        elif quadrant == "Dog" and gap_kwd > 0.050:
            signal = "Re-engineer recipe or prune from delivery menu"
        elif gap_kwd > 0.250:
            signal = "Monitor conversion — priced at premium vs. peer"
        else:
            signal = "Hold price — competitive band"

        records.append(
            {
                "Our Item": our_name,
                "Quadrant": quadrant,
                "Our KWD": round(our_price, 3),
                "Competitor Match": str(best_item["item_name"]),
                "Comp KWD": round(comp_price, 3),
                "Gap (KWD)": gap_kwd,
                "Gap (%)": gap_pct,
                "Action Signal": signal,
            }
        )

    return pd.DataFrame(records)


# ============================================================================
# 3. Playwright — Headless Browser Snapshot & Portal Inspector
# ============================================================================


def _playwright_worker(
    safe_url: str,
    output_path: Path,
    wait_ms: int,
) -> dict[str, Any]:
    """Run sync_playwright in a dedicated worker thread (avoids asyncio loop clashes in Streamlit)."""
    from playwright.sync_api import sync_playwright

    started = time.perf_counter()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = None
        engine_used = "chromium"
        ws_endpoint = (
            os.getenv("PLAYWRIGHT_WS_ENDPOINT")
            or os.getenv("BROWSERLESS_WS_ENDPOINT")
            or ""
        ).strip()

        if ws_endpoint:
            engine_used = "remote-cdp"
            browser = (
                p.chromium.connect_over_cdp(ws_endpoint)
                if ws_endpoint.startswith("http")
                else p.chromium.connect(ws_endpoint)
            )
        else:
            for channel in (None, "msedge", "chrome"):
                try:
                    browser = (
                        p.chromium.launch(headless=True, channel=channel)
                        if channel
                        else p.chromium.launch(headless=True)
                    )
                    engine_used = f"chromium:{channel}" if channel else "chromium:bundled"
                    break
                except Exception:
                    continue

        if browser is None:
            raise RuntimeError(
                "No headless Chromium/Edge/Chrome binary available. Run `playwright install chromium`."
            )

        try:
            context = browser.new_context(
                viewport={"width": 1440, "height": 900},
                locale="en-KW",
            )
            page = context.new_page()
            http_status: int | None = None
            try:
                resp = page.goto(safe_url, wait_until="networkidle", timeout=16_000)
                http_status = resp.status if resp else None
            except Exception:
                resp = page.goto(safe_url, wait_until="domcontentloaded", timeout=20_000)
                http_status = resp.status if resp else None

            if wait_ms > 0:
                page.wait_for_timeout(min(wait_ms, 3000))

            page.screenshot(path=str(output_path), full_page=True)
            title = page.title() or safe_url
            final_url = page.url
            visible_excerpt = page.evaluate(
                "() => (document.body?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 900)"
            )
            elapsed_ms = round((time.perf_counter() - started) * 1000)

            return {
                "mode": "live",
                "engine": engine_used,
                "url": final_url,
                "title": title,
                "http_status": http_status,
                "latency_ms": elapsed_ms,
                "screenshot_path": str(output_path),
                "excerpt": visible_excerpt,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        finally:
            browser.close()


def capture_portal_snapshot(
    url: str,
    output_filename: str | None = None,
    *,
    allow_localhost: bool = False,
    wait_ms: int = 400,
) -> dict[str, Any]:
    """
    3. Capture a full-page 1440x900 headless screenshot, HTTP status, load latency,
    and visible text excerpt for dashboard health checks or delivery aggregator portals.
    """
    safe_url = validate_target_url(url, allow_localhost=allow_localhost)
    safe_name = re.sub(
        r"[^a-zA-Z0-9._-]",
        "_",
        Path(output_filename or f"portal_{int(time.time())}.png").name,
    )
    if not safe_name.lower().endswith(".png"):
        safe_name = f"{safe_name}.png"
    target_path = SNAPSHOT_DIR / safe_name

    try:
        with ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(
                _playwright_worker, safe_url, target_path, wait_ms
            ).result(timeout=35)
    except Exception as exc:
        return {
            "mode": "fallback",
            "engine": "unavailable",
            "url": safe_url,
            "title": "Snapshot Fallback (Browser Unavailable)",
            "http_status": None,
            "latency_ms": 0,
            "screenshot_path": None,
            "excerpt": f"Playwright could not capture {safe_url}: {exc}",
            "fallback_reason": str(exc),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


# ============================================================================
# 4. Composio + Claude — Multi-App Action Dispatcher (Gmail, Sheets, Slack/WA)
# ============================================================================


def get_composio_tools_for_claude(
    actions: list[str] | None = None,
    user_id: str | None = None,
) -> tuple[Any | None, list[dict[str, Any]]]:
    """
    4a. Initialize Composio with `AnthropicProvider` and fetch tool schemas
    ready to pass directly into `anthropic.Anthropic().messages.create(tools=...)`.
    """
    api_key = (os.getenv("COMPOSIO_API_KEY") or "").strip()
    target_actions = actions or [
        "GMAIL_SEND_EMAIL",
        "GOOGLESHEETS_BATCH_UPDATE",
        "SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL",
    ]
    resolved_user = user_id or os.getenv("COMPOSIO_ENTITY_ID") or "default"

    if not api_key:
        # Return offline Claude-compatible schemas for inspection / dry-run
        demo_schemas = [
            {
                "name": slug,
                "description": f"Composio external action schema for {slug} (Demo Mode)",
                "input_schema": {
                    "type": "object",
                    "properties": {"payload": {"type": "object"}},
                },
            }
            for slug in target_actions
        ]
        return None, demo_schemas

    from composio import Composio
    from composio_anthropic import AnthropicProvider

    composio_client = Composio(provider=AnthropicProvider(), api_key=api_key)
    tools = composio_client.tools.get(user_id=resolved_user, tools=target_actions)
    return composio_client, list(tools)


def dispatch_composio_action(
    channel: ComposioChannel,
    arguments: dict[str, Any],
    *,
    use_claude_agent: bool = False,
    agent_instruction: str | None = None,
) -> dict[str, Any]:
    """
    4b. Dispatch an action across Gmail, Google Sheets, Slack, or WhatsApp via Composio
    (directly or orchestrated by Claude `AnthropicProvider`), falling back to a transparent
    dry-run preview when `COMPOSIO_API_KEY` is not yet set.
    """
    action_slug = COMPOSIO_ACTION_SLUGS[channel]
    composio_key = (os.getenv("COMPOSIO_API_KEY") or "").strip()
    anthropic_key = (os.getenv("ANTHROPIC_API_KEY") or "").strip()
    user_id = (os.getenv("COMPOSIO_ENTITY_ID") or "default").strip()
    connected_account = (os.getenv("COMPOSIO_CONNECTED_ACCOUNT_ID") or "").strip() or None

    if not composio_key:
        return {
            "mode": "demo",
            "channel": channel,
            "action_slug": action_slug,
            "dispatched": False,
            "summary": (
                f"Dry-run validated `{action_slug}` payload. Add `COMPOSIO_API_KEY` in `.env` "
                "to execute against your connected workspace account."
            ),
            "payload_preview": arguments,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    try:
        from composio import Composio
        from composio_anthropic import AnthropicProvider

        composio_client = Composio(provider=AnthropicProvider(), api_key=composio_key)

        if use_claude_agent and anthropic_key:
            from anthropic import Anthropic

            claude = Anthropic(api_key=anthropic_key)
            tools = composio_client.tools.get(user_id=user_id, tools=[action_slug])
            model_name = os.getenv("ANTHROPIC_MODEL") or "claude-3-5-haiku-latest"
            prompt_text = (
                agent_instruction
                or f"Execute {action_slug} using these exact parameters: {json.dumps(arguments, ensure_ascii=False)}"
            )

            msg = claude.messages.create(
                model=model_name,
                max_tokens=800,
                tools=tools,
                messages=[{"role": "user", "content": prompt_text}],
            )
            execution_result = composio_client.provider.handle_tool_calls(
                user_id=user_id,
                response=msg,
            )
            return {
                "mode": "live-claude-agent",
                "channel": channel,
                "action_slug": action_slug,
                "dispatched": True,
                "summary": f"Claude ({model_name}) executed `{action_slug}` via Composio.",
                "response": str(execution_result)[:1500],
                "payload_preview": arguments,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        exec_kwargs: dict[str, Any] = {
            "user_id": user_id,
            "dangerously_skip_version_check": True,
        }
        if connected_account:
            exec_kwargs["connected_account_id"] = connected_account

        res = composio_client.tools.execute(action_slug, arguments, **exec_kwargs)
        res_dump = res.model_dump() if hasattr(res, "model_dump") else str(res)
        return {
            "mode": "live-direct",
            "channel": channel,
            "action_slug": action_slug,
            "dispatched": True,
            "summary": f"Executed `{action_slug}` via Composio API.",
            "response": res_dump,
            "payload_preview": arguments,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        return {
            "mode": "fallback",
            "channel": channel,
            "action_slug": action_slug,
            "dispatched": False,
            "summary": f"Composio execution encountered an error; captured payload safely: {exc}",
            "payload_preview": arguments,
            "fallback_reason": str(exc),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
