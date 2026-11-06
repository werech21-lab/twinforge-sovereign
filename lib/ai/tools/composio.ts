export type ComposioActionSlug =
  | "GMAIL_SEND_EMAIL"
  | "GOOGLESHEETS_BATCH_UPDATE"
  | "GOOGLESHEETS_SPREADSHEETS_VALUES_APPEND"
  | "SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL";

export type ClaudeToolSchema = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export type ComposioExecutionResult = {
  action: string;
  successful: boolean;
  data: unknown;
  error?: string | null;
};

const BUILTIN_COMPOSIO_CLAUDE_TOOLS: ClaudeToolSchema[] = [
  {
    name: "GMAIL_SEND_EMAIL",
    description:
      "إرسال بريد إلكتروني عبر Gmail من خلال خدمة Composio إلى المستلم المحدد.",
    input_schema: {
      type: "object",
      properties: {
        recipient_email: {
          type: "string",
          description: "عنوان البريد الإلكتروني للمستلم",
        },
        subject: {
          type: "string",
          description: "عنوان الرسالة",
        },
        body: {
          type: "string",
          description: "محتوى الرسالة النصي أو HTML",
        },
      },
      required: ["recipient_email", "subject", "body"],
    },
  },
  {
    name: "GOOGLESHEETS_BATCH_UPDATE",
    description:
      "تحديث صفوف وخلايا في جدول بيانات Google Sheets عبر خدمة Composio.",
    input_schema: {
      type: "object",
      properties: {
        spreadsheet_id: {
          type: "string",
          description: "معرّف جدول بيانات Google Sheets",
        },
        sheet_name: {
          type: "string",
          description: "اسم الورقة داخل الملف (مثال: Sheet1)",
        },
        range: {
          type: "string",
          description: "النطاق المراد تحديثه مثل Sheet1!A1",
        },
        values: {
          type: "array",
          description: "مصفوفة ثنائية الأبعاد للصفوف والأعمدة",
          items: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
      required: ["spreadsheet_id", "values"],
    },
  },
  {
    name: "SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL",
    description: "إرسال إشعار أو ملخص تنفيذي إلى قناة Slack عبر Composio.",
    input_schema: {
      type: "object",
      properties: {
        channel: {
          type: "string",
          description: "معرّف قناة Slack أو اسمها",
        },
        text: {
          type: "string",
          description: "نص الرسالة المراد إرسالها",
        },
      },
      required: ["channel", "text"],
    },
  },
];

export function isComposioConfigured(): boolean {
  return Boolean(process.env.COMPOSIO_API_KEY);
}

/**
 * 4. خدمة Composio لتجهيز أدوات البريد وجداول البيانات وSlack لتمريرها مباشرة إلى Claude
 * وتنفيذ الإجراءات عبر واجهة Composio v3.1.
 */
export function getComposioToolsForClaude(
  actions?: ComposioActionSlug[],
): ClaudeToolSchema[] {
  if (!actions || actions.length === 0) {
    return BUILTIN_COMPOSIO_CLAUDE_TOOLS.filter(
      (t) =>
        t.name === "GMAIL_SEND_EMAIL" || t.name === "GOOGLESHEETS_BATCH_UPDATE",
    );
  }
  const allowed = new Set<string>(actions);
  return BUILTIN_COMPOSIO_CLAUDE_TOOLS.filter((tool) => allowed.has(tool.name));
}

export async function executeComposioAction(
  actionSlug: ComposioActionSlug | string,
  args: Record<string, unknown>,
  opts?: {
    userId?: string;
    connectedAccountId?: string;
    timeoutMs?: number;
  },
): Promise<ComposioExecutionResult> {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    throw new Error("مفتاح COMPOSIO_API_KEY غير مضبوط في متغيرات البيئة");
  }

  const slug = actionSlug.trim().toUpperCase();
  if (!/^[A-Z0-9_]+$/.test(slug)) {
    throw new Error(`اسم إجراء Composio غير صالح: ${actionSlug}`);
  }

  const connectedAccountId =
    opts?.connectedAccountId ||
    process.env.COMPOSIO_CONNECTED_ACCOUNT_ID ||
    undefined;
  const userId = opts?.userId || process.env.COMPOSIO_ENTITY_ID || undefined;
  const timeoutMs = opts?.timeoutMs ?? 25_000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body: Record<string, unknown> = {
      version: "latest",
      arguments: args,
    };
    if (userId) body.user_id = userId;
    if (connectedAccountId) body.connected_account_id = connectedAccountId;

    const res = await fetch(
      `https://backend.composio.dev/api/v3.1/tools/execute/${encodeURIComponent(slug)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Composio ${res.status}: ${errText.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      successful?: boolean;
      data?: unknown;
      error?: string | null;
    };

    return {
      action: slug,
      successful: json.successful ?? true,
      data: json.data ?? json,
      error: json.error ?? null,
    };
  } finally {
    clearTimeout(timer);
  }
}
