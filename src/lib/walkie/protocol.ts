/** Shared wire rules for signaling ids, rooms, and PTT messages. */

export const SIGNAL_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;
export const MAX_SIGNAL_PAYLOAD_BYTES = 32_768;
export const MAX_PEERS_PER_CHANNEL = 8;
export const CALLSIGN_MAX = 24;
export const CALLSIGN_MIN = 2;

export type NetworkMode = "world" | "closed";

export type PttWire = { type: "ptt"; on: boolean };

export function isValidSignalId(value: string): boolean {
  return SIGNAL_ID_RE.test(value);
}

export function isValidSignalPayload(value: unknown): boolean {
  if (value === undefined) return false;
  try {
    return JSON.stringify(value).length <= MAX_SIGNAL_PAYLOAD_BYTES;
  } catch {
    return false;
  }
}

export function isPttWire(value: unknown): value is PttWire {
  if (!value || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  return rec.type === "ptt" && typeof rec.on === "boolean";
}

export function sanitizeCallsign(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ").slice(0, CALLSIGN_MAX);
  if (name.length < CALLSIGN_MIN) return null;
  return name;
}

export function sanitizeChannelId(raw: string): string | null {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  if (!slug || !isValidSignalId(slug)) return null;
  return slug;
}

export function newPeerId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = "p-";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out.slice(0, 18);
}
