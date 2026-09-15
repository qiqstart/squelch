/** Shareable listen links: /?c=channel&n=closed&s=origin&h=callsign */

import { channelDisplayName, resolveChannel } from "./channels.ts";
import { sanitizeCallsign, sanitizeChannelId, type NetworkMode } from "./protocol.ts";
import {
  buildSession,
  defaultPrefs,
  type JoinError,
  type WalkiePrefs,
  type WalkieSession,
} from "./session.ts";
import { ServerAddressError, normalizeOrigin } from "./server.ts";

export type InviteSearch = {
  c?: string;
  n?: string;
  s?: string;
  h?: string;
  f?: string;
};

export type ParsedInvite = {
  channel: string;
  channelName: string;
  mode: NetworkMode;
  serverAddress: string;
  hostCallsign: string | null;
  faceId: string | null;
};

export type ParseInviteResult =
  | { ok: true; invite: ParsedInvite }
  | { ok: false; reason: "missing" | "channel" | "server" };

const GUEST_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function readSearchString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function coerceInviteSearch(raw: Record<string, unknown>): InviteSearch {
  return {
    c: readSearchString(raw.c),
    n: readSearchString(raw.n),
    s: readSearchString(raw.s),
    h: readSearchString(raw.h),
    f: readSearchString(raw.f),
  };
}

export function parseInviteSearch(search: InviteSearch): ParseInviteResult {
  if (!search.c) return { ok: false, reason: "missing" };

  const channel = resolveChannel(search.c);
  if (!channel) return { ok: false, reason: "channel" };

  const mode: NetworkMode = search.n === "closed" ? "closed" : "world";
  let serverAddress = "";
  if (mode === "closed") {
    if (!search.s) return { ok: false, reason: "server" };
    try {
      serverAddress = normalizeOrigin(search.s);
    } catch (err) {
      if (err instanceof ServerAddressError) return { ok: false, reason: "server" };
      return { ok: false, reason: "server" };
    }
  }

  return {
    ok: true,
    invite: {
      channel: channel.id,
      channelName: channel.name,
      mode,
      serverAddress,
      hostCallsign: search.h ? sanitizeCallsign(search.h) : null,
      faceId: search.f ? search.f.trim().toLowerCase() : null,
    },
  };
}

export function buildInviteSearch(input: {
  channelId: string;
  mode: NetworkMode;
  serverAddress?: string;
  hostCallsign?: string;
  faceId?: string;
}): InviteSearch {
  const channel = sanitizeChannelId(input.channelId) ?? input.channelId;
  const search: InviteSearch = { c: channel };
  if (input.mode === "closed") {
    search.n = "closed";
    if (input.serverAddress) {
      try {
        search.s = normalizeOrigin(input.serverAddress);
      } catch {
        search.s = input.serverAddress.trim();
      }
    }
  }
  const host = input.hostCallsign ? sanitizeCallsign(input.hostCallsign) : null;
  if (host) search.h = host;
  if (input.faceId) search.f = input.faceId;
  return search;
}

export function invitePath(search: InviteSearch): string {
  const params = new URLSearchParams();
  if (search.c) params.set("c", search.c);
  if (search.n && search.n !== "world") params.set("n", search.n);
  if (search.s) params.set("s", search.s);
  if (search.h) params.set("h", search.h);
  if (search.f) params.set("f", search.f);
  const q = params.toString();
  return q ? `/?${q}` : "/";
}

export function inviteUrlFromSession(origin: string, session: WalkieSession): string {
  const path = invitePath(
    buildInviteSearch({
      channelId: session.channelId,
      mode: session.mode,
      serverAddress: session.serverAddress,
      hostCallsign: session.callsign,
      faceId: session.faceId,
    }),
  );
  return `${origin.replace(/\/$/, "")}${path}`;
}

export function shareDescription(session: Pick<WalkieSession, "callsign" | "channelName">): string {
  return `${session.callsign} is on ${session.channelName}`;
}

/** Clipboard / share body: link first, then the description. */
export function shareCopyText(url: string, description: string): string {
  const link = url.trim();
  const blurb = description.trim();
  if (!link) return blurb;
  if (!blurb) return link;
  return `${link}\n${blurb}`;
}

export function sharePayload(
  origin: string,
  session: WalkieSession,
): { url: string; description: string; text: string } {
  const url = inviteUrlFromSession(origin, session);
  const description = shareDescription(session);
  return { url, description, text: shareCopyText(url, description) };
}

export function sessionFromInvite(
  invite: ParsedInvite,
  callsign: string,
  extras: Partial<WalkiePrefs> = {},
): ReturnType<typeof buildSession> {
  const result = buildSession({
    ...defaultPrefs(),
    ...extras,
    callsign,
    channel: invite.channel,
    mode: invite.mode,
    serverAddress: invite.serverAddress,
    faceId: invite.faceId ?? extras.faceId ?? defaultPrefs().faceId,
  });
  if ("session" in result) {
    return { session: { ...result.session, viaInvite: true } };
  }
  return result;
}

/** Opening a share link should land on the radio, not a tap interstitial. */
export function shouldAutoJoin(parsed: ParseInviteResult, skipInvite: boolean): boolean {
  return parsed.ok && !skipInvite;
}

export function callsignForInvite(storedCallsign: string, random: () => number = Math.random): string {
  return sanitizeCallsign(storedCallsign) ?? generateGuestCallsign(random);
}

export function autoJoinFromInvite(
  invite: ParsedInvite,
  prefs: Pick<WalkiePrefs, "callsign" | "operatorFace" | "faceId">,
  random: () => number = Math.random,
): { session: WalkieSession } | { errors: JoinError[] } {
  const callsign = callsignForInvite(prefs.callsign, random);
  return sessionFromInvite(invite, callsign, {
    operatorFace: prefs.operatorFace,
    faceId: prefs.faceId,
  });
}

export function generateGuestCallsign(random: () => number = Math.random): string {
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += GUEST_ALPHABET[Math.floor(random() * GUEST_ALPHABET.length)] ?? "A";
  }
  return `G-${suffix}`;
}

export function inviteHeadline(invite: ParsedInvite): string {
  if (invite.hostCallsign) return `${invite.hostCallsign} is on ${invite.channelName}`;
  return `You're invited to ${invite.channelName}`;
}

export function inviteChannelLabel(channelId: string): string {
  return channelDisplayName(channelId);
}
