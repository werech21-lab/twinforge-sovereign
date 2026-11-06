export const ACTIVE_TWIN_KEY = "tf_active_twin_id";

export function readActiveTwinId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_TWIN_KEY);
  } catch {
    return null;
  }
}

export function writeActiveTwinId(id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_TWIN_KEY, id);
    window.dispatchEvent(
      new CustomEvent("tf-active-twin", { detail: { twinId: id } }),
    );
  } catch {
    // ignore
  }
}

export type TwinBrief = {
  id: string;
  name: string;
  energy: number;
  mood?: number;
  reputation?: number;
  status?: string;
  personality_summary?: string | null;
};

export function pickActiveTwin<T extends { id: string }>(
  twins: T[],
  preferredId?: string | null,
): T | null {
  if (!twins.length) return null;
  if (preferredId) {
    const hit = twins.find((t) => t.id === preferredId);
    if (hit) return hit;
  }
  return twins[0];
}
