import { sanitizeChannelId } from "./protocol.ts";

export interface PublicChannel {
  id: string;
  name: string;
  blurb: string;
}

export const PUBLIC_CHANNELS: readonly PublicChannel[] = [
  { id: "world", name: "World", blurb: "Open net" },
  { id: "alpha", name: "Alpha", blurb: "Primary" },
  { id: "bravo", name: "Bravo", blurb: "Secondary" },
  { id: "charlie", name: "Charlie", blurb: "Tactical" },
  { id: "delta", name: "Delta", blurb: "Support" },
  { id: "local", name: "Local", blurb: "Near net" },
] as const;

const PUBLIC_IDS = new Set(PUBLIC_CHANNELS.map((c) => c.id));

export function isPublicChannel(id: string): boolean {
  return PUBLIC_IDS.has(id);
}

export function channelDisplayName(id: string): string {
  const known = PUBLIC_CHANNELS.find((c) => c.id === id);
  if (known) return known.name;
  return id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function resolveChannel(raw: string): { id: string; name: string } | null {
  const id = sanitizeChannelId(raw);
  if (!id) return null;
  return { id, name: channelDisplayName(id) };
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
