"use client";

import { useEffect } from "react";

export default function ReferralCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref")?.trim();
      if (ref && ref.length <= 48) {
        localStorage.setItem("tf_ref", ref);
        document.cookie = `tf_ref=${encodeURIComponent(ref)}; path=/; max-age=2592000; SameSite=Lax`;
      }
    } catch {
      // Ignore storage access errors in restricted contexts
    }
  }, []);

  return null;
}
