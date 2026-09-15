import type { NetworkMode } from "./protocol.ts";

const RTC_PATH = "/api/rtc";
const CHANNELS_PATH = "/api/channels";

export class ServerAddressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerAddressError";
  }
}

/** Strip a pasted URL down to origin. Accepts host-only or full /api/rtc URLs. */
export function normalizeOrigin(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new ServerAddressError("Enter a server address");
  if (/\s/.test(trimmed)) throw new ServerAddressError("Server address cannot contain spaces");

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new ServerAddressError("That does not look like a server address");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ServerAddressError("Server must be http or https");
  }
  if (!parsed.hostname) throw new ServerAddressError("Missing host");
  if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
    // Allow loopback for local closed nets.
  }
  return parsed.origin;
}

export function resolveSignalingUrl(mode: NetworkMode, serverAddress: string): string {
  if (mode === "world") return RTC_PATH;
  return `${normalizeOrigin(serverAddress)}${RTC_PATH}`;
}

export function resolveChannelsUrl(mode: NetworkMode, serverAddress: string): string {
  if (mode === "world") return CHANNELS_PATH;
  return `${normalizeOrigin(serverAddress)}${CHANNELS_PATH}`;
}

export function isSameOriginSignaling(url: string): boolean {
  return url.startsWith("/");
}
