// ============================================================
// CRYPTO UTILITIES — Web Crypto API (no third-party dependency)
// ============================================================

/** Returns the SHA-256 hex string of an arbitrary string */
export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Returns the SHA-256 base64url string of an arbitrary string */
export async function sha256Base64(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}

/** Base64url encode and decode for URL-safe shareable buyer links */
export function encodeReportForURL(obj: unknown): string {
  const json = JSON.stringify(obj);
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeReportFromURL<T>(encoded: string): T | null {
  try {
    let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const json = decodeURIComponent(escape(atob(base64)));
    return JSON.parse(json) as T;
  } catch (err) {
    console.error("Failed to decode report from URL:", err);
    return null;
  }
}
