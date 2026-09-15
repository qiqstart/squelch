import { sanitizeCallsign } from "./protocol.ts";
import type { NetworkMode } from "./protocol.ts";
import { resolveSignalingUrl, ServerAddressError } from "./server.ts";
import { resolveChannel } from "./channels.ts";

const STORAGE_KEY = "squelch.session.v1";

export interface WalkiePrefs {
  callsign: string;
  channel: string;
  mode: NetworkMode;
  serverAddress: string;
  faceId: string;
  operatorFace: string;
}

export interface WalkieSession {
  callsign: string;
  channelId: string;
  channelName: string;
  mode: NetworkMode;
  serverAddress: string;
  signalingUrl: string;
  viaInvite: boolean;
  faceId: string;
  operatorFace: string;
}

export function defaultPrefs(): WalkiePrefs {
  return {
    callsign: "",
    channel: "world",
    mode: "world",
    serverAddress: "",
    faceId: "steel",
    operatorFace: "fox",
  };
}

export function loadPrefs(): WalkiePrefs {
  if (typeof window === "undefined") return defaultPrefs();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrefs();
    const parsed = JSON.parse(raw) as Partial<WalkiePrefs>;
    return {
      ...defaultPrefs(),
      callsign: typeof parsed.callsign === "string" ? parsed.callsign : "",
      channel: typeof parsed.channel === "string" ? parsed.channel : "world",
      mode: parsed.mode === "closed" ? "closed" : "world",
      serverAddress: typeof parsed.serverAddress === "string" ? parsed.serverAddress : "",
      faceId: typeof parsed.faceId === "string" && parsed.faceId ? parsed.faceId : "steel",
      operatorFace:
        typeof parsed.operatorFace === "string" && parsed.operatorFace
          ? parsed.operatorFace
          : "fox",
    };
  } catch {
    return defaultPrefs();
  }
}

export function savePrefs(prefs: WalkiePrefs): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export type JoinError = { field: "callsign" | "channel" | "server"; message: string };

export function buildSession(
  prefs: WalkiePrefs,
): { session: WalkieSession } | { errors: JoinError[] } {
  const errors: JoinError[] = [];
  const callsign = sanitizeCallsign(prefs.callsign);
  if (!callsign) errors.push({ field: "callsign", message: "Callsign needs at least two characters" });

  const channel = resolveChannel(prefs.channel);
  if (!channel) errors.push({ field: "channel", message: "Pick a channel or type a private name" });

  let signalingUrl = "/api/rtc";
  if (prefs.mode === "closed") {
    try {
      signalingUrl = resolveSignalingUrl("closed", prefs.serverAddress);
    } catch (err) {
      const message = err instanceof ServerAddressError ? err.message : "Invalid server address";
      errors.push({ field: "server", message });
    }
  }

  if (errors.length || !callsign || !channel) return { errors };

  return {
    session: {
      callsign,
      channelId: channel.id,
      channelName: channel.name,
      mode: prefs.mode,
      serverAddress: prefs.mode === "closed" ? prefs.serverAddress.trim() : "",
      signalingUrl,
      viaInvite: false,
      faceId: prefs.faceId || "steel",
      operatorFace: prefs.operatorFace || "fox",
    },
  };
}
