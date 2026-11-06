import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  type Locale,
  normalizeLocale,
  translate,
  type MessageKey,
} from "@/lib/i18n/translations";

export async function getRequestLocale(): Promise<Locale> {
  try {
    const jar = await cookies();
    return normalizeLocale(jar.get(LOCALE_COOKIE)?.value);
  } catch {
    return DEFAULT_LOCALE;
  }
}

export async function serverT(
  key: MessageKey | string,
  vars?: Record<string, string | number>,
) {
  const locale = await getRequestLocale();
  return translate(locale, key, vars);
}
