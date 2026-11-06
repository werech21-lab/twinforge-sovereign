"""
Kuwait F&B Operations & Menu Engineering Console
with Market & Competitor AI (Perplexity, Firecrawl, Playwright, Composio + Claude).

Styled following Unslop UI conventions:
- Flat 1px hairline borders, restrained stone/ink palette, zero decorative gradients
- Tabular monospace numerals and 3-decimal KWD currency precision
- Transparent LIVE vs. DEMO / DRY-RUN operational badges
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd
import streamlit as st

from services.external_ai_tools import (
    ComposioChannel,
    MarketFocus,
    capture_portal_snapshot,
    compare_with_menu_matrix,
    dispatch_composio_action,
    get_composio_tools_for_claude,
    get_default_menu_engineering_df,
    get_integrations_status,
    query_kuwait_market_intel,
    scrape_competitor_menu,
)

st.set_page_config(
    page_title="F&B Ops & Market Intelligence — Kuwait",
    layout="wide",
    initial_sidebar_state="collapsed",
)

UNSLOP_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

html, body, [class*="css"] {
    font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #141618;
}

.block-container {
    padding-top: 1.75rem !important;
    padding-bottom: 3rem !important;
    max-width: 1280px !important;
}

/* Restrained editorial header */
.ops-header {
    border-bottom: 1px solid #DCD9D0;
    padding-bottom: 1rem;
    margin-bottom: 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 0.75rem;
}
.ops-eyebrow {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #5C6166;
    margin-bottom: 0.2rem;
}
.ops-title {
    font-size: 1.55rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: #141618;
    margin: 0;
}
.ops-subtitle {
    font-size: 0.88rem;
    color: #52575C;
    margin: 0.2rem 0 0 0;
}

/* Status strip & pills */
.status-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.6rem;
    margin-bottom: 1.5rem;
}
.status-cell {
    background: #FFFFFF;
    border: 1px solid #DFDDD6;
    border-radius: 6px;
    padding: 0.65rem 0.85rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.status-name {
    font-size: 0.82rem;
    font-weight: 500;
    color: #1F2328;
}
.badge {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.68rem;
    font-weight: 500;
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
    letter-spacing: 0.03em;
}
.badge-live {
    background: #E7F2EC;
    color: #18543A;
    border: 1px solid #BBDACA;
}
.badge-demo {
    background: #F4EFE4;
    color: #7A5413;
    border: 1px solid #E2D2B5;
}

/* KPI grid */
.kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1.25rem;
}
.kpi-box {
    background: #FFFFFF;
    border: 1px solid #DFDDD6;
    border-radius: 6px;
    padding: 0.85rem 1rem;
}
.kpi-label {
    font-size: 0.75rem;
    color: #5C6166;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-family: 'IBM Plex Mono', monospace;
}
.kpi-value {
    font-family: 'IBM Plex Mono', monospace;
    font-variant-numeric: tabular-nums;
    font-size: 1.35rem;
    font-weight: 600;
    color: #141618;
    margin-top: 0.25rem;
}
.kpi-meta {
    font-size: 0.76rem;
    color: #5C6166;
    margin-top: 0.15rem;
}

/* Section header */
.section-bar {
    border-top: 1px solid #DCD9D0;
    padding-top: 1.25rem;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
}
.section-heading {
    font-size: 1.15rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: #141618;
    margin: 0;
}
.section-desc {
    font-size: 0.84rem;
    color: #52575C;
    margin: 0.15rem 0 0 0;
}

/* Clean panel card */
.intel-card {
    background: #FFFFFF;
    border: 1px solid #DFDDD6;
    border-radius: 6px;
    padding: 1rem 1.15rem;
    margin-top: 0.75rem;
}
.mono-note {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.75rem;
    color: #52575C;
}

/* Tighten Streamlit buttons and inputs */
.stButton > button {
    border-radius: 5px !important;
    font-weight: 500 !important;
    font-size: 0.85rem !important;
    border: 1px solid #C8C5BC !important;
}
.stButton > button[kind="primary"] {
    background-color: #1E4D3B !important;
    border-color: #1E4D3B !important;
    color: #FFFFFF !important;
}
div[data-baseweb="tab-list"] {
    gap: 0.25rem;
    border-bottom: 1px solid #DFDDD6;
}
button[data-baseweb="tab"] {
    font-size: 0.85rem !important;
    font-weight: 500 !important;
}
</style>
"""
st.markdown(UNSLOP_CSS, unsafe_allow_html=True)

# ----------------------------------------------------------------------------
# Session State Initialization
# ----------------------------------------------------------------------------
if "our_menu_df" not in st.session_state:
    st.session_state.our_menu_df = get_default_menu_engineering_df()
if "market_intel_result" not in st.session_state:
    st.session_state.market_intel_result = None
if "scraped_menu_result" not in st.session_state:
    st.session_state.scraped_menu_result = None
if "comparison_df" not in st.session_state:
    st.session_state.comparison_df = pd.DataFrame()
if "snapshot_result" not in st.session_state:
    st.session_state.snapshot_result = None
if "composio_result" not in st.session_state:
    st.session_state.composio_result = None
if "staged_brief_text" not in st.session_state:
    st.session_state.staged_brief_text = (
        "Kuwait F&B Daily Price & Demand Check:\n"
        "- Double Wagyu Smash Burger priced -0.300 KWD below peer benchmark.\n"
        "- Recommend testing +0.150 KWD adjustment on aggregator menu."
    )

statuses = get_integrations_status()

# ----------------------------------------------------------------------------
# Editorial Header & Connectivity Strip
# ----------------------------------------------------------------------------
st.markdown(
    """
    <div class="ops-header">
      <div>
        <div class="ops-eyebrow">KUWAIT F&B OPERATIONS · KWD (3-DEC)</div>
        <h1 class="ops-title">Menu Engineering & Market Intelligence</h1>
        <p class="ops-subtitle">
          Internal margin matrix paired with live Perplexity research, Firecrawl menu extraction, Playwright portal checks, and Composio dispatch.
        </p>
      </div>
      <div class="mono-note">CURRENCY: KWD · REGION: KW / GCC</div>
    </div>
    """,
    unsafe_allow_html=True,
)

strip_cells = []
for key in ("perplexity", "firecrawl", "playwright", "composio"):
    info = statuses[key]
    badge_cls = "badge-live" if info["live"] else "badge-demo"
    strip_cells.append(
        f'<div class="status-cell">'
        f'<span class="status-name">{info["label"]}</span>'
        f'<span class="badge {badge_cls}">{info["mode"]}</span>'
        f"</div>"
    )
st.markdown(
    f'<div class="status-strip">{"".join(strip_cells)}</div>',
    unsafe_allow_html=True,
)

# ----------------------------------------------------------------------------
# Baseline Menu Engineering Matrix Summary
# ----------------------------------------------------------------------------
menu_df: pd.DataFrame = st.session_state.our_menu_df.copy()
menu_df["margin_kwd"] = (menu_df["our_price_kwd"] - menu_df["food_cost_kwd"]).round(3)
menu_df["food_cost_pct"] = (
    (menu_df["food_cost_kwd"] / menu_df["our_price_kwd"].replace(0, pd.NA)) * 100
).fillna(0.0).round(1)
weekly_revenue = float((menu_df["our_price_kwd"] * menu_df["weekly_units"]).sum())
weekly_cogs = float((menu_df["food_cost_kwd"] * menu_df["weekly_units"]).sum())
weekly_gp = weekly_revenue - weekly_cogs
blended_fc = (weekly_cogs / weekly_revenue * 100) if weekly_revenue > 0 else 0.0
avg_price = float(menu_df["our_price_kwd"].mean()) if not menu_df.empty else 0.0
star_count = int((menu_df["quadrant"] == "Star").sum())

st.markdown(
    f"""
    <div class="kpi-grid">
      <div class="kpi-box">
        <div class="kpi-label">Weekly Gross Profit</div>
        <div class="kpi-value">{weekly_gp:,.3f} KWD</div>
        <div class="kpi-meta">On {weekly_revenue:,.3f} KWD gross sales</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Blended Food Cost</div>
        <div class="kpi-value">{blended_fc:.1f}%</div>
        <div class="kpi-meta">Target band: 26.0% – 30.0%</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Mean Menu Price</div>
        <div class="kpi-value">{avg_price:.3f} KWD</div>
        <div class="kpi-meta">{len(menu_df)} active SKUs ({star_count} Stars)</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Peer Price Gaps Tracked</div>
        <div class="kpi-value">{len(st.session_state.comparison_df)}</div>
        <div class="kpi-meta">Matched against Menu Matrix</div>
      </div>
    </div>
    """,
    unsafe_allow_html=True,
)

with st.expander("Baseline Menu Engineering Matrix (Editable KWD SKUs)", expanded=False):
    edited_df = st.data_editor(
        menu_df,
        width="stretch",
        hide_index=True,
        num_rows="dynamic",
        column_config={
            "item_name": st.column_config.TextColumn("Menu Item", required=True),
            "category": st.column_config.TextColumn("Category", required=True),
            "our_price_kwd": st.column_config.NumberColumn(
                "Our Price (KWD)", format="%.3f", min_value=0.100, step=0.050
            ),
            "food_cost_kwd": st.column_config.NumberColumn(
                "Food Cost (KWD)", format="%.3f", min_value=0.050, step=0.025
            ),
            "weekly_units": st.column_config.NumberColumn(
                "Weekly Units", min_value=0, step=5
            ),
            "quadrant": st.column_config.SelectboxColumn(
                "Matrix Quadrant",
                options=["Star", "Plowhorse", "Puzzle", "Dog"],
                required=True,
            ),
            "margin_kwd": st.column_config.NumberColumn(
                "Unit Margin (KWD)", format="%.3f", disabled=True
            ),
            "food_cost_pct": st.column_config.NumberColumn(
                "Food Cost %", format="%.1f%%", disabled=True
            ),
        },
    )
    st.session_state.our_menu_df = edited_df

# ----------------------------------------------------------------------------
# Market & Competitor AI Section
# ----------------------------------------------------------------------------
st.markdown(
    """
    <div class="section-bar">
      <h2 class="section-heading">Market & Competitor AI</h2>
      <p class="section-desc">
        Live Kuwait market & inflation intelligence, competitor KWD menu extraction, portal snapshots, and multi-app workflow dispatch.
      </p>
    </div>
    """,
    unsafe_allow_html=True,
)

tab_pplx, tab_fc, tab_pw, tab_comp = st.tabs(
    [
        "1 · Perplexity Market Intel",
        "2 · Firecrawl Menu Comparator",
        "3 · Playwright Portal Check",
        "4 · Composio Action Dispatch",
    ]
)

# --- TAB 1: Perplexity (`sonar-pro`) ---
with tab_pplx:
    col_lens, col_preset = st.columns([1, 2])
    with col_lens:
        focus_map: dict[str, MarketFocus] = {
            "Kuwait Market Trends": "trends",
            "Weather & Event Sales Impact": "weather_events",
            "Ingredient Price Inflation": "inflation",
        }
        selected_focus_label = st.selectbox(
            "Research Lens",
            options=list(focus_map.keys()),
        )
        selected_focus = focus_map[selected_focus_label]

    default_queries: dict[MarketFocus, str] = {
        "trends": (
            "What are current fast-casual burger, combo meal, and specialty coffee price "
            "benchmarks in Kuwait (KWD) across Talabat and Deliveroo?"
        ),
        "weather_events": (
            "How do Kuwait summer heat spikes (>44C), dust warnings, and payday weeks "
            "shift dine-in traffic vs. evening delivery order volume?"
        ),
        "inflation": (
            "What are recent wholesale price trends in Kuwait for chilled beef, GCC poultry, "
            "frying oil, and dairy, and how are restaurants protecting gross margin?"
        ),
    }

    with col_preset:
        market_query = st.text_input(
            "Market Question (`sonar-pro`)",
            value=default_queries[selected_focus],
        )

    run_pplx_col, stage_pplx_col, _ = st.columns([1, 1.3, 3])
    with run_pplx_col:
        trigger_pplx = st.button(
            "Run Perplexity Lookup", type="primary", width="stretch"
        )
    with stage_pplx_col:
        stage_pplx = st.button(
            "Stage Brief to Composio",
            width="stretch",
            disabled=st.session_state.market_intel_result is None,
        )

    if trigger_pplx:
        with st.spinner("Querying Perplexity sonar-pro..."):
            st.session_state.market_intel_result = query_kuwait_market_intel(
                market_query, focus=selected_focus
            )

    if stage_pplx and st.session_state.market_intel_result:
        st.session_state.staged_brief_text = st.session_state.market_intel_result["answer"]
        st.toast("Market brief staged in Tab 4 (Composio Action Dispatch).")

    intel: dict[str, Any] | None = st.session_state.market_intel_result
    if intel:
        mode_tag = "LIVE API" if intel["mode"] == "live" else f"{intel['mode'].upper()} MODE"
        badge_class = "badge-live" if intel["mode"] == "live" else "badge-demo"
        st.markdown(
            f'<div class="intel-card">'
            f'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem;">'
            f'<span class="mono-note">MODEL: {intel["model"]} · LENS: {intel["focus"]}</span>'
            f'<span class="badge {badge_class}">{mode_tag}</span>'
            f"</div>",
            unsafe_allow_html=True,
        )
        st.markdown(intel["answer"])
        if intel.get("fallback_reason"):
            st.caption(f"Fallback note: {intel['fallback_reason']}")
        if intel.get("citations"):
            st.markdown("**Cited Sources**")
            for idx, cite in enumerate(intel["citations"], start=1):
                st.markdown(f"{idx}. [{cite['title']}]({cite['url']})")
        st.markdown("</div>", unsafe_allow_html=True)

# --- TAB 2: Firecrawl Competitor Menu Scraper & Matrix Comparison ---
with tab_fc:
    fc_col_url, fc_col_btn = st.columns([3.5, 1])
    with fc_col_url:
        comp_url = st.text_input(
            "Competitor Menu or Aggregator Storefront URL",
            value="https://www.talabat.com/kuwait/elevation-burger",
            placeholder="https://...",
        )
    with fc_col_btn:
        st.write("")
        run_fc = st.button("Extract & Compare", type="primary", width="stretch")

    if run_fc:
        try:
            with st.spinner("Extracting competitor menu & computing KWD matrix gaps..."):
                scraped = scrape_competitor_menu(comp_url)
                st.session_state.scraped_menu_result = scraped
                st.session_state.comparison_df = compare_with_menu_matrix(
                    scraped.get("items", []),
                    st.session_state.our_menu_df,
                )
        except ValueError as err:
            st.error(str(err))

    scraped_res: dict[str, Any] | None = st.session_state.scraped_menu_result
    if scraped_res:
        fc_mode = scraped_res["mode"]
        fc_badge = "badge-live" if fc_mode == "live" else "badge-demo"
        st.markdown(
            f'<div style="display:flex;justify-content:space-between;align-items:center;margin:0.5rem 0;">'
            f'<span class="mono-note">SOURCE: {scraped_res["restaurant_name"]} ({len(scraped_res.get("items", []))} items)</span>'
            f'<span class="badge {fc_badge}">{fc_mode.upper()}</span>'
            f"</div>",
            unsafe_allow_html=True,
        )
        if scraped_res.get("fallback_reason"):
            st.caption(f"Fallback note: {scraped_res['fallback_reason']}")

        comp_matrix_df: pd.DataFrame = st.session_state.comparison_df
        if not comp_matrix_df.empty:
            st.markdown("**Menu Engineering Price Gap Analysis (KWD)**")
            st.dataframe(
                comp_matrix_df,
                width="stretch",
                hide_index=True,
                column_config={
                    "Our KWD": st.column_config.NumberColumn(format="%.3f KWD"),
                    "Comp KWD": st.column_config.NumberColumn(format="%.3f KWD"),
                    "Gap (KWD)": st.column_config.NumberColumn(format="%+.3f KWD"),
                    "Gap (%)": st.column_config.NumberColumn(format="%+.1f%%"),
                },
            )

        with st.expander("Raw Extracted Competitor Menu Items", expanded=False):
            raw_items_df = pd.DataFrame(scraped_res.get("items", []))
            if not raw_items_df.empty:
                st.dataframe(
                    raw_items_df,
                    width="stretch",
                    hide_index=True,
                    column_config={
                        "price_kwd": st.column_config.NumberColumn(
                            "Price (KWD)", format="%.3f KWD"
                        )
                    },
                )
            else:
                st.info("No structured items returned; inspect markdown excerpt below.")
                st.code(scraped_res.get("markdown_excerpt", ""))

# --- TAB 3: Playwright Headless Portal & Health Check ---
with tab_pw:
    pw_mode_col, pw_url_col, pw_btn_col = st.columns([1.4, 2.6, 1])
    with pw_mode_col:
        pw_target_type = st.selectbox(
            "Inspection Mode",
            options=[
                "Aggregator / Competitor Portal",
                "Local Dashboard Health Check",
            ],
        )
    is_local_health = pw_target_type == "Local Dashboard Health Check"
    default_pw_url = (
        "http://localhost:8501"
        if is_local_health
        else "https://example.com"
    )
    with pw_url_col:
        pw_url = st.text_input("Target URL", value=default_pw_url)
    with pw_btn_col:
        st.write("")
        run_pw = st.button("Capture Snapshot", type="primary", width="stretch")

    if run_pw:
        try:
            with st.spinner("Launching headless browser (1440x900)..."):
                st.session_state.snapshot_result = capture_portal_snapshot(
                    pw_url,
                    allow_localhost=is_local_health,
                )
        except ValueError as err:
            st.error(str(err))

    snap: dict[str, Any] | None = st.session_state.snapshot_result
    if snap:
        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Mode / Engine", snap.get("engine", "n/a"))
        m2.metric("HTTP Status", str(snap.get("http_status") or "n/a"))
        m3.metric("Load Latency", f"{snap.get('latency_ms', 0)} ms")
        m4.metric("Page Title", (snap.get("title") or "Untitled")[:28])

        snap_path = snap.get("screenshot_path")
        if snap_path and Path(snap_path).exists():
            st.image(
                snap_path,
                caption=f"{snap.get('title')} — {snap.get('url')} ({snap_path})",
                width="stretch",
            )
        if snap.get("excerpt"):
            with st.expander("Visible DOM Text Excerpt", expanded=False):
                st.text(snap["excerpt"])

# --- TAB 4: Composio + Claude Action Dispatcher ---
with tab_comp:
    left_cfg, right_preview = st.columns([1.4, 1.6])

    with left_cfg:
        channel_labels: dict[str, ComposioChannel] = {
            "Gmail — Executive Summary": "gmail",
            "Google Sheets — Sync KWD Price Matrix": "googlesheets",
            "Slack — Ops Channel Alert": "slack",
            "WhatsApp — Manager Ping": "whatsapp",
        }
        chosen_channel_label = st.selectbox(
            "Destination App", options=list(channel_labels.keys())
        )
        chosen_channel = channel_labels[chosen_channel_label]
        use_claude = st.checkbox(
            "Orchestrate via Claude Agent (`composio-anthropic`)",
            value=statuses["composio"]["claude_ready"],
        )

        payload: dict[str, Any] = {}
        if chosen_channel == "gmail":
            recipient = st.text_input("Recipient Email", value="ops@kuwait-kitchen.kw")
            subject = st.text_input(
                "Email Subject", value="Kuwait Competitor KWD Pricing & Margin Brief"
            )
            body = st.text_area(
                "Message Body", value=st.session_state.staged_brief_text, height=130
            )
            payload = {
                "recipient_email": recipient,
                "subject": subject,
                "body": body,
            }
        elif chosen_channel == "googlesheets":
            sheet_id = st.text_input(
                "Spreadsheet ID", value="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
            )
            sheet_range = st.text_input("Target Range", value="CompetitorMatrix!A1")
            comp_df: pd.DataFrame = st.session_state.comparison_df
            rows_matrix = (
                [comp_df.columns.tolist(), *comp_df.astype(str).values.tolist()]
                if not comp_df.empty
                else [
                    ["Our Item", "Our KWD", "Comp KWD", "Gap (KWD)"],
                    ["Double Wagyu Smash Burger", "2.950", "3.250", "-0.300"],
                ]
            )
            payload = {
                "spreadsheet_id": sheet_id,
                "range": sheet_range,
                "values": rows_matrix,
            }
        elif chosen_channel == "slack":
            slack_channel = st.text_input("Slack Channel", value="#kw-pricing-ops")
            slack_text = st.text_area(
                "Slack Alert Text",
                value=st.session_state.staged_brief_text,
                height=120,
            )
            payload = {"channel": slack_channel, "text": slack_text}
        else:
            phone = st.text_input("WhatsApp Recipient (+965)", value="+96550000000")
            wa_text = st.text_area(
                "WhatsApp Brief",
                value=st.session_state.staged_brief_text,
                height=120,
            )
            payload = {"recipient_phone": phone, "message": wa_text}

        dispatch_btn = st.button(
            "Dispatch Action via Composio", type="primary", width="stretch"
        )
        if dispatch_btn:
            with st.spinner("Dispatching Composio workflow..."):
                st.session_state.composio_result = dispatch_composio_action(
                    chosen_channel,
                    payload,
                    use_claude_agent=use_claude,
                )

    with right_preview:
        _, claude_schemas = get_composio_tools_for_claude()
        st.markdown("**Registered Claude Tool Schemas (`AnthropicProvider`)**")
        st.code(
            ", ".join(t.get("name", "tool") for t in claude_schemas),
            language="text",
        )
        st.markdown("**Staged Action Payload**")
        st.json(payload)

        comp_out: dict[str, Any] | None = st.session_state.composio_result
        if comp_out:
            out_live = comp_out.get("dispatched", False)
            out_badge = "badge-live" if out_live else "badge-demo"
            st.markdown(
                f'<div class="intel-card">'
                f'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">'
                f'<span class="mono-note">ACTION: {comp_out["action_slug"]}</span>'
                f'<span class="badge {out_badge}">{comp_out["mode"].upper()}</span>'
                f"</div>"
                f'<div style="font-size:0.86rem;">{comp_out["summary"]}</div>'
                f"</div>",
                unsafe_allow_html=True,
            )
            if comp_out.get("response"):
                st.code(str(comp_out["response"]), language="json")
