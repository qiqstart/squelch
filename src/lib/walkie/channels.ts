import { sanitizeChannelId } from "./protocol.ts";

export interface PublicChannel {
  id: string;
  number: number;
  name: string;
  blurb: string;
}

export const PUBLIC_CHANNELS: readonly PublicChannel[] = [
  { id: "world", number: 1, name: "World", blurb: "Open net" },
  { id: "alpha", number: 2, name: "Alpha", blurb: "Primary" },
  { id: "bravo", number: 3, name: "Bravo", blurb: "Secondary" },
  { id: "charlie", number: 4, name: "Charlie", blurb: "Tactical" },
  { id: "delta", number: 5, name: "Delta", blurb: "Support" },
  { id: "local", number: 6, name: "Local", blurb: "Near net" },
] as const;

const PUBLIC_IDS = new Set(PUBLIC_CHANNELS.map((c) => c.id));
const PUBLIC_BY_NUMBER = new Map(PUBLIC_CHANNELS.map((c) => [c.number, c]));

export function isPublicChannel(id: string): boolean {
  return PUBLIC_IDS.has(id);
}

export function channelDisplayName(id: string): string {
  const known = PUBLIC_CHANNELS.find((c) => c.id === id);
  if (known) return known.name;
  return id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Private rooms land on FRS-style 07–22 so the dial always looks like a handheld. */
export function hashChannelNumber(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 7 + (h >>> 0) % 16;
}

export function channelNumber(id: string): number {
  const known = PUBLIC_CHANNELS.find((c) => c.id === id);
  if (known) return known.number;
  return hashChannelNumber(id);
}

export function formatChannelDial(idOrNumber: string | number): string {
  const n = typeof idOrNumber === "number" ? idOrNumber : channelNumber(idOrNumber);
  return `CH ${String(n).padStart(2, "0")}`;
}

export function formatChannelLabel(id: string, name = channelDisplayName(id)): string {
  return `${formatChannelDial(id)} ${name}`;
}

export function publicChannelByNumber(raw: string): PublicChannel | undefined {
  if (!/^\d{1,2}$/.test(raw)) return undefined;
  const n = Number(raw);
  return PUBLIC_BY_NUMBER.get(n);
}

export function resolveChannel(raw: string): { id: string; name: string; number: number } | null {
  const id = sanitizeChannelId(raw);
  if (!id) return null;
  const numbered = publicChannelByNumber(id);
  if (numbered) return { id: numbered.id, name: numbered.name, number: numbered.number };
  const known = PUBLIC_CHANNELS.find((c) => c.id === id);
  if (known) return { id: known.id, name: known.name, number: known.number };
  return { id, name: channelDisplayName(id), number: hashChannelNumber(id) };
}

export interface Occupancy {
  id: string;
  listeners: number;
}

export function mergeOccupancy(
  occupancy: Occupancy[],
): Array<PublicChannel & { listeners: number }> {
  const counts = new Map(occupancy.map((o) => [o.id, o.listeners]));
  return PUBLIC_CHANNELS.map((ch) => ({
    ...ch,
    listeners: counts.get(ch.id) ?? 0,
  }));
}
