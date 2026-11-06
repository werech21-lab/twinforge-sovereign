const PRIVATE_IPV4_PATTERNS = [
  /^127\./,
  /^10\./,
  /^0\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
];

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "0.0.0.0",
  "::1",
  "[::1]",
  "metadata.google.internal",
]);

/**
 * يتحقق من أن الرابط خارجي وآمن (يمنع SSRF والوصول إلى الشبكة الداخلية).
 */
export function assertSafeExternalUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error(`رابط غير صالح: ${rawUrl}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("يُسمح فقط بروابط HTTP أو HTTPS");
  }

  const host = parsed.hostname.toLowerCase();
  if (
    BLOCKED_HOSTNAMES.has(host) ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    PRIVATE_IPV4_PATTERNS.some((re) => re.test(host))
  ) {
    throw new Error("لا يُسمح بفحص العناوين المحلية أو الداخلية");
  }

  return parsed;
}

/**
 * يستخرج الروابط الصالحة من نص المهمة.
 */
export function extractUrlsFromText(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s"'<>)\]]+/gi) || [];
  const unique = new Set<string>();

  for (const raw of matches) {
    const cleaned = raw.replace(/[.,;:!?]+$/, "");
    try {
      const safe = assertSafeExternalUrl(cleaned);
      unique.add(safe.toString());
    } catch {
      // تجاهل الروابط غير الصالحة أو الداخلية
    }
  }

  return Array.from(unique);
}
