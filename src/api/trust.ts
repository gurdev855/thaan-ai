export interface SignedCertificate {
  fingerprint: string;
  shareId: string;
}

const apiBase = import.meta.env.VITE_API_BASE_URL || "";

export async function signReport(payload: Record<string, unknown>): Promise<SignedCertificate> {
  const response = await fetch(`${apiBase}/api/sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Certificate signing failed (${response.status}): ${body}`);
  }
  return response.json() as Promise<SignedCertificate>;
}

export async function verifyReport(
  payload: Record<string, unknown>,
  fingerprint: string
): Promise<boolean> {
  const response = await fetch(`${apiBase}/api/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload, fingerprint }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Certificate verification failed (${response.status}): ${body}`);
  }
  const result = (await response.json()) as { verified?: boolean };
  return result.verified === true;
}

export async function loadSharedReport(shareId: string): Promise<{
  payload: Record<string, unknown>;
  fingerprint: string;
  shareId: string;
}> {
  const response = await fetch(`${apiBase}/api/share/${encodeURIComponent(shareId)}`);
  if (!response.ok) throw new Error("This share certificate was not found or has expired.");
  return response.json();
}
