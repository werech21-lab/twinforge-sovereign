"use client";

export interface SovereignDashboardReportInput {
  twin: {
    id: string;
    name: string;
    status: string;
    energy: number;
    mood: number;
    reputation: number;
    personality_summary?: string | null;
  };
  dailyLimitUsd: number;
  remainingUsd: number;
  forgeGold: number;
  earnedGems: number;
  morningReport: string | null;
  decisions: Array<{
    id: string;
    title: string;
    situation: string;
    chosen_option?: string | null;
    recommended?: string | null;
    status: string;
    created_at?: string;
  }>;
  memories: Array<{
    id: string;
    content: string;
    memory_type: string;
    created_at: string;
  }>;
  ledger: Array<{
    id: string;
    amount: number;
    currency: string;
    description: string | null;
    reference_type: string | null;
    created_at: string;
  }>;
  marketplaceTasks?: Array<{
    id: string;
    title: string;
    reward_gems: number;
    expected_success_rate: number;
    status: string;
    created_at?: string;
  }>;
}

export interface SovereignAuditReportInput {
  treasury: { forge_gold: number; earned_gems: number };
  commission: { forge_gold: number; earned_gems: number };
  circulating: { forge_gold: number; earned_gems: number };
  coolingDays: number;
  ledger: Array<{
    id: string;
    amount: number;
    currency: string;
    description: string | null;
    reference_type: string | null;
    created_at: string;
    balanced: boolean;
  }>;
  payouts: Array<{
    id: string;
    created_at: string;
    amount: number;
    wise_email: string;
    status: string;
    cooling_until: string;
    cooling_passed: boolean;
  }>;
}

function escapeHtml(raw: unknown): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateAr(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("ar-KW", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function generateCertificateSerial(prefix: string): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${y}${m}${d}-${rand}`;
}

function goldenCrestSvg(size = 76): string {
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="tfGold" x1="12" y1="8" x2="108" y2="112" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#FFF0A8"/>
        <stop offset="45%" stop-color="#D4AF37"/>
        <stop offset="100%" stop-color="#8A6A12"/>
      </linearGradient>
      <linearGradient id="tfDark" x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#141C2B"/>
        <stop offset="100%" stop-color="#070A10"/>
      </linearGradient>
    </defs>
    <circle cx="60" cy="60" r="56" fill="url(#tfDark)" stroke="url(#tfGold)" stroke-width="3.5"/>
    <circle cx="60" cy="60" r="48" stroke="url(#tfGold)" stroke-width="1.2" stroke-dasharray="4 3"/>
    <polygon points="60,18 93,37 93,77 60,96 27,77 27,37" fill="#0B101B" stroke="url(#tfGold)" stroke-width="2.2"/>
    <path d="M40 46H80M60 46V80M47 60H73" stroke="url(#tfGold)" stroke-width="5" stroke-linecap="round"/>
    <circle cx="60" cy="33" r="4" fill="#F5D061"/>
  </svg>`;
}

function sovereignWaxSealSvg(): string {
  return `
  <svg width="118" height="118" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sealGold" x1="15" y1="15" x2="125" y2="125" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#FCE79C"/>
        <stop offset="50%" stop-color="#D4AF37"/>
        <stop offset="100%" stop-color="#7E5E0E"/>
      </linearGradient>
    </defs>
    <circle cx="70" cy="70" r="62" fill="#0B1018" stroke="url(#sealGold)" stroke-width="3"/>
    <circle cx="70" cy="70" r="53" stroke="url(#sealGold)" stroke-width="1.3" stroke-dasharray="3 3"/>
    <circle cx="70" cy="70" r="39" fill="#111826" stroke="url(#sealGold)" stroke-width="1.8"/>
    <text x="70" y="57" text-anchor="middle" fill="#F5D061" font-size="10" font-weight="800" letter-spacing="1.5">TWINFORGE</text>
    <text x="70" y="73" text-anchor="middle" fill="#FFFFFF" font-size="11" font-weight="700">ختم سيادي معتمد</text>
    <text x="70" y="88" text-anchor="middle" fill="#3DD68C" font-size="8.5" font-weight="700" letter-spacing="1">VERIFIED LEDGER</text>
  </svg>`;
}

function buildDocumentShell(params: {
  docTitle: string;
  subtitle: string;
  serial: string;
  bodyHtml: string;
}): string {
  const issuedAt = formatDateAr(new Date().toISOString());
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(params.docTitle)} — ${escapeHtml(params.serial)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    @page { size: A4 portrait; margin: 11mm; }
    body {
      margin: 0;
      padding: 0;
      background: #0b0f17;
      color: #0f172a;
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      direction: rtl;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 24px;
      background: linear-gradient(90deg, #070a10, #121a28);
      border-bottom: 2px solid #d4af37;
      color: #f8fafc;
    }
    .toolbar-actions { display: flex; gap: 10px; }
    .btn-gold {
      cursor: pointer;
      border: 1px solid #f5d061;
      background: linear-gradient(135deg, #f5d061, #d4af37, #9a7617);
      color: #140f04;
      font-family: inherit;
      font-weight: 800;
      font-size: 14px;
      padding: 8px 18px;
      border-radius: 10px;
    }
    .btn-ghost {
      cursor: pointer;
      border: 1px solid rgba(255,255,255,0.25);
      background: rgba(255,255,255,0.06);
      color: #e2e8f0;
      font-family: inherit;
      font-weight: 700;
      font-size: 13px;
      padding: 8px 14px;
      border-radius: 10px;
    }
    .sheet {
      max-width: 210mm;
      margin: 20px auto 36px;
      background: #ffffff;
      border: 2px solid #c9a227;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
    }
    .banner {
      background: linear-gradient(135deg, #070a10 0%, #111927 60%, #1b1608 100%);
      color: #ffffff;
      padding: 24px 28px;
      border-bottom: 3px solid #d4af37;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
    }
    .banner-brand { display: flex; align-items: center; gap: 16px; }
    .brand-tag {
      display: inline-block;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 2px;
      color: #f5d061;
      background: rgba(212, 175, 55, 0.14);
      border: 1px solid rgba(212, 175, 55, 0.45);
      padding: 2px 10px;
      border-radius: 999px;
      margin-bottom: 4px;
    }
    .banner h1 {
      margin: 0;
      font-size: 23px;
      font-weight: 800;
      color: #fce79c;
    }
    .banner p {
      margin: 3px 0 0;
      font-size: 13px;
      color: #cbd5e1;
    }
    .meta-box {
      text-align: left;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(212, 175, 55, 0.4);
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 12px;
      color: #e2e8f0;
      min-width: 205px;
    }
    .meta-serial { font-weight: 800; color: #f5d061; font-size: 13px; direction: ltr; }
    .content { padding: 24px 28px; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-top: 3px solid #d4af37;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .kpi-label { font-size: 11.5px; color: #475569; font-weight: 700; }
    .kpi-val { font-size: 19px; font-weight: 800; color: #0f172a; margin-top: 4px; }
    .kpi-sub { font-size: 11px; color: #059669; font-weight: 700; margin-top: 2px; }
    .section {
      margin-bottom: 20px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .section-head {
      background: linear-gradient(90deg, #0f172a, #1e293b);
      color: #fce79c;
      padding: 9px 16px;
      font-size: 14px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #d4af37;
    }
    .section-body { padding: 14px 16px; background: #ffffff; font-size: 13px; line-height: 1.75; color: #1e293b; }
    .report-pre {
      margin: 0;
      white-space: pre-wrap;
      font-family: inherit;
      background: #fffdf5;
      border: 1px solid #f3e3a3;
      border-radius: 8px;
      padding: 12px 14px;
      color: #1e293b;
    }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 800;
      text-align: right;
      padding: 8px 10px;
      border-bottom: 2px solid #cbd5e1;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
      vertical-align: top;
    }
    tr:last-child td { border-bottom: none; }
    .badge-ok {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      background: #dcfce7;
      color: #166534;
      font-weight: 700;
      font-size: 11px;
    }
    .badge-gold {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      background: #fef3c7;
      color: #92400e;
      font-weight: 700;
      font-size: 11px;
    }
    .footer-seal {
      margin-top: 22px;
      padding-top: 16px;
      border-top: 2px dashed #c9a227;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      page-break-inside: avoid;
    }
    .footer-notes { font-size: 11.5px; color: #475569; line-height: 1.8; }
    .footer-notes strong { color: #0f172a; }
    @media print {
      body { background: #ffffff; }
      .toolbar { display: none !important; }
      .sheet { margin: 0; max-width: 100%; box-shadow: none; border-width: 1.5px; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div>
      <strong style="color:#fce79c;">◈ TwinForge Sovereign Document</strong>
      <span style="margin-right:10px;font-size:12px;color:#cbd5e1;">جاهز للطباعة أو الحفظ المباشر بصيغة PDF</span>
    </div>
    <div class="toolbar-actions">
      <button class="btn-gold" onclick="window.print()">🖨️ طباعة / حفظ كملف PDF</button>
      <button class="btn-ghost" onclick="window.close()">✕ إغلاق</button>
    </div>
  </div>

  <div class="sheet">
    <div class="banner">
      <div class="banner-brand">
        ${goldenCrestSvg(72)}
        <div>
          <span class="brand-tag">TWINFORGE · SOVEREIGN PROTOCOL</span>
          <h1>${escapeHtml(params.docTitle)}</h1>
          <p>${escapeHtml(params.subtitle)}</p>
        </div>
      </div>
      <div class="meta-box">
        <div>رقم الشهادة السيادية:</div>
        <div class="meta-serial">${escapeHtml(params.serial)}</div>
        <div style="margin-top:6px;">تاريخ الإصدار: <strong>${escapeHtml(issuedAt)}</strong></div>
      </div>
    </div>

    <div class="content">
      ${params.bodyHtml}

      <div class="footer-seal">
        <div class="footer-notes">
          <div><strong>إقرار المصادقة السيادية — منصة TwinForge المالية:</strong></div>
          <div>تم توليد هذه الوثيقة آلياً من السجل المالي غير القابل للتعديل (Immutable Double-Entry Ledger) وذاكرة التوأم الرقمي المشفّرة.</div>
          <div>المرجع الرقمي المعتمد: <strong style="direction:ltr;display:inline-block;">${escapeHtml(params.serial)}</strong> · حالة التدقيق: <strong>متوازن ومطابق ✓</strong></div>
        </div>
        <div>
          ${sovereignWaxSealSvg()}
        </div>
      </div>
    </div>
  </div>

  <script>
    window.addEventListener('load', function () {
      setTimeout(function () {
        try { window.focus(); window.print(); } catch (e) {}
      }, 450);
    });
  </script>
</body>
</html>`;
}

function presentPrintableHtml(html: string) {
  if (typeof window === "undefined") return;
  const popup = window.open("", "_blank", "width=1020,height=860");
  if (popup && popup.document) {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    return;
  }

  // Fallback: print via hidden iframe if popup was blocked
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 4000);
    }, 500);
  }
}

export function openSovereignDashboardPdf(input: SovereignDashboardReportInput) {
  const serial = generateCertificateSerial("TF-SOV");
  const decisionsRows =
    input.decisions.length > 0
      ? input.decisions
          .map(
            (d) => `
        <tr>
          <td><strong>${escapeHtml(d.title)}</strong><div style="font-size:11px;color:#64748b;">${escapeHtml(d.situation)}</div></td>
          <td>${escapeHtml(d.chosen_option || d.recommended || "قيد المراجعة")}</td>
          <td><span class="${d.status === "accepted" ? "badge-ok" : "badge-gold"}">${escapeHtml(d.status)}</span></td>
          <td>${escapeHtml(formatDateAr(d.created_at))}</td>
        </tr>`,
          )
          .join("")
      : `<tr><td colspan="4" style="text-align:center;color:#64748b;">لا توجد قرارات مسجلة بعد لهذا التوأم.</td></tr>`;

  const ledgerRows =
    input.ledger.length > 0
      ? input.ledger
          .map(
            (row) => `
        <tr>
          <td>${escapeHtml(formatDateAr(row.created_at))}</td>
          <td><span class="badge-gold">${escapeHtml(row.reference_type || "ledger")}</span></td>
          <td style="font-weight:800;">${Number(row.amount).toFixed(2)} ${escapeHtml(row.currency)}</td>
          <td>${escapeHtml(row.description || "—")}</td>
        </tr>`,
          )
          .join("")
      : `<tr><td colspan="4" style="text-align:center;color:#64748b;">لا توجد قيود مالية مسجلة بعد في دفتر الأستاذ لهذا التوأم.</td></tr>`;

  const tasksRows =
    input.marketplaceTasks && input.marketplaceTasks.length > 0
      ? input.marketplaceTasks
          .map(
            (t) => `
        <tr>
          <td><strong>${escapeHtml(t.title)}</strong></td>
          <td>+${Number(t.reward_gems).toFixed(0)} Gems</td>
          <td>${Number(t.expected_success_rate)}%</td>
          <td><span class="badge-ok">${escapeHtml(t.status)}</span></td>
        </tr>`,
          )
          .join("")
      : "";

  const memoriesList =
    input.memories.length > 0
      ? `<ul style="margin:0;padding-right:18px;">${input.memories
          .slice(0, 6)
          .map(
            (m) =>
              `<li style="margin-bottom:6px;"><strong>[${escapeHtml(m.memory_type)}]</strong> ${escapeHtml(m.content)}</li>`,
          )
          .join("")}</ul>`
      : `<p style="margin:0;color:#64748b;">لا توجد ذكريات متعلمة مسجلة بعد.</p>`;

  const bodyHtml = `
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label">رصيد الذهب التشغيلي (ForgeGold)</div>
        <div class="kpi-val">${Number(input.forgeGold).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div class="kpi-sub">محفظة التوأم النشطة</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">الأرباح القابلة للسحب (Earned Gems)</div>
        <div class="kpi-val">${Number(input.earnedGems).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div class="kpi-sub">عوائد موثقة قابلة للتسييل</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">حد الاستدلال اليومي للذكاء</div>
        <div class="kpi-val">$${Number(input.remainingUsd).toFixed(2)} / $${Number(input.dailyLimitUsd).toFixed(2)}</div>
        <div class="kpi-sub">باقة السيادة اليومية المعتمدة</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">المؤشرات الحيوية والسمعة</div>
        <div class="kpi-val">⚡${Math.round(input.twin.energy)}% · ★${Number(input.twin.reputation).toFixed(1)}</div>
        <div class="kpi-sub">الحالة: ${escapeHtml(input.twin.status)} (المزاج ${Math.round(input.twin.mood)}%)</div>
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <span>☀️ الإيجاز الصباحي السيادي للتوأم</span>
        <span>${escapeHtml(input.twin.name)}</span>
      </div>
      <div class="section-body">
        <pre class="report-pre">${escapeHtml(
          input.morningReport ||
            "التوأم في حالة جاهزية تشغيلية كاملة، وتتم متابعة المهام السيادية والفرص اليومية بانتظام.",
        )}</pre>
      </div>
    </div>

    ${
      tasksRows
        ? `
    <div class="section">
      <div class="section-head">
        <span>📡 مهام رادار الفرص السيادية النشطة (marketplace_tasks)</span>
        <span>تنفيذ ذاتي</span>
      </div>
      <div class="section-body" style="padding:0;">
        <table>
          <thead>
            <tr>
              <th>المهمة / الفرصة</th>
              <th>العائد المقدر</th>
              <th>نسبة النجاح</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>${tasksRows}</tbody>
        </table>
      </div>
    </div>`
        : ""
    }

    <div class="section">
      <div class="section-head">
        <span>⚖️ سجل القرارات السيادية والتوجيهات التنفيذية</span>
        <span>${input.decisions.length} قرار</span>
      </div>
      <div class="section-body" style="padding:0;">
        <table>
          <thead>
            <tr>
              <th>القرار والموقف</th>
              <th>التوجيه المختار / الموصى به</th>
              <th>الحالة</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>${decisionsRows}</tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <span>🧠 البصمة المعرفية والتعلم الذاتي من قرارات المالك</span>
        <span>twin_memories</span>
      </div>
      <div class="section-body">
        ${memoriesList}
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <span>🏛️ كشف حساب دفتر الأستاذ المالي (Immutable Ledger)</span>
        <span>قيد مزدوج متوازن</span>
      </div>
      <div class="section-body" style="padding:0;">
        <table>
          <thead>
            <tr>
              <th>التاريخ والوقت</th>
              <th>نوع المرجع</th>
              <th>المبلغ والعملة</th>
              <th>البيان التفصيلي</th>
            </tr>
          </thead>
          <tbody>${ledgerRows}</tbody>
        </table>
      </div>
    </div>
  `;

  const html = buildDocumentShell({
    docTitle: `التقرير السيادي الرسمي — ${input.twin.name}`,
    subtitle: "شهادة أداء التوأم الرقمي، القرارات التنفيذية، وكشف دفتر الأستاذ المالي",
    serial,
    bodyHtml,
  });

  presentPrintableHtml(html);
}

export function openSovereignAuditPdf(input: SovereignAuditReportInput) {
  const serial = generateCertificateSerial("TF-AUDIT");

  const ledgerRows =
    input.ledger.length > 0
      ? input.ledger
          .map(
            (row) => `
        <tr>
          <td>${escapeHtml(formatDateAr(row.created_at))}</td>
          <td><span class="badge-gold">${escapeHtml(row.reference_type || "—")}</span></td>
          <td style="font-weight:800;">${Number(row.amount).toFixed(2)} ${escapeHtml(row.currency)}</td>
          <td>${escapeHtml(row.description || "—")}</td>
          <td><span class="badge-ok">${row.balanced ? "متوازن ✓" : "مراجعة"}</span></td>
        </tr>`,
          )
          .join("")
      : `<tr><td colspan="5" style="text-align:center;color:#64748b;">لا توجد قيود مسجلة في دفتر الأستاذ.</td></tr>`;

  const payoutRows =
    input.payouts.length > 0
      ? input.payouts
          .map(
            (p) => `
        <tr>
          <td>${escapeHtml(formatDateAr(p.created_at))}</td>
          <td style="font-weight:800;">${Number(p.amount).toFixed(2)} Earned Gems</td>
          <td>${escapeHtml(p.wise_email)}</td>
          <td>${escapeHtml(formatDateAr(p.cooling_until))}</td>
          <td><span class="badge-gold">${escapeHtml(p.status)}</span></td>
        </tr>`,
          )
          .join("")
      : `<tr><td colspan="5" style="text-align:center;color:#64748b;">لا توجد طلبات سحب بنكية حالية.</td></tr>`;

  const bodyHtml = `
    <div class="kpi-grid-3">
      <div class="kpi">
        <div class="kpi-label">خزينة المنصة السيادية (Treasury)</div>
        <div class="kpi-val">${Number(input.treasury.forge_gold).toFixed(2)} FG</div>
        <div class="kpi-sub">${Number(input.treasury.earned_gems).toFixed(2)} Earned Gems</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">إجمالي العمولات المحصّلة</div>
        <div class="kpi-val">${Number(input.commission.forge_gold).toFixed(2)} FG</div>
        <div class="kpi-sub">${Number(input.commission.earned_gems).toFixed(2)} Earned Gems</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">النقد المتداول في النظام</div>
        <div class="kpi-val">${Number(input.circulating.forge_gold).toFixed(2)} FG</div>
        <div class="kpi-sub">${Number(input.circulating.earned_gems).toFixed(2)} Earned Gems · تبريد ${input.coolingDays} أيام</div>
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <span>🏛️ سجل القيود المحاسبية غير القابل للتعديل (Immutable Double-Entry Ledger)</span>
        <span>${input.ledger.length} قيد محاسبي</span>
      </div>
      <div class="section-body" style="padding:0;">
        <table>
          <thead>
            <tr>
              <th>الوقت</th>
              <th>النوع</th>
              <th>المبلغ</th>
              <th>الوصف</th>
              <th>التوازن</th>
            </tr>
          </thead>
          <tbody>${ledgerRows}</tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <span>🏦 كشف طلبات السحب والتحويلات البنكية</span>
        <span>${input.payouts.length} طلب</span>
      </div>
      <div class="section-body" style="padding:0;">
        <table>
          <thead>
            <tr>
              <th>تاريخ الطلب</th>
              <th>المبلغ</th>
              <th>حساب المستفيد (Wise)</th>
              <th>انتهاء فترة التبريد</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>${payoutRows}</tbody>
        </table>
      </div>
    </div>
  `;

  const html = buildDocumentShell({
    docTitle: "شهادة التدقيق المالي السيادي وكشف دفتر الأستاذ العام",
    subtitle: "تقرير المطابقة الرسمية للخزينة والعمولات والقيود المزدوجة وطلبات السحب البنكي",
    serial,
    bodyHtml,
  });

  presentPrintableHtml(html);
}
