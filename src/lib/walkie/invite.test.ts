import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  autoJoinFromInvite,
  buildInviteSearch,
  callsignForInvite,
  coerceInviteSearch,
  generateGuestCallsign,
  inviteHeadline,
  invitePath,
  inviteUrlFromSession,
  parseInviteSearch,
  sessionFromInvite,
  shareCopyText,
  shareDescription,
  sharePayload,
  shouldAutoJoin,
} from "./invite.ts";
import { defaultPrefs, type WalkieSession } from "./session.ts";

describe("coerceInviteSearch", () => {
  it("reads string params and drops empties", () => {
    assert.deepEqual(
      coerceInviteSearch({ c: " alpha ", n: 1, s: "", h: "FOX-1" }),
      { c: "alpha", n: undefined, s: undefined, h: "FOX-1", f: undefined },
    );
  });
});

describe("parseInviteSearch", () => {
  it("is missing when there is no channel", () => {
    assert.deepEqual(parseInviteSearch({}), { ok: false, reason: "missing" });
  });

  it("slugs a world-net channel and optional host", () => {
    const result = parseInviteSearch({ c: "Night Watch", h: " FOX-1 " });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.invite.channel, "night-watch");
    assert.equal(result.invite.channelName, "Night Watch");
    assert.ok(result.invite.channelNumber >= 7);
    assert.equal(result.invite.mode, "world");
    assert.equal(result.invite.hostCallsign, "FOX-1");
    assert.equal(result.invite.serverAddress, "");
  });

  it("accepts a handheld channel number", () => {
    const result = parseInviteSearch({ c: "2" });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.invite.channel, "alpha");
    assert.equal(result.invite.channelNumber, 2);
  });

  it("rejects a dirty channel", () => {
    assert.deepEqual(parseInviteSearch({ c: "***" }), { ok: false, reason: "channel" });
  });

  it("requires a valid server on closed nets", () => {
    assert.deepEqual(parseInviteSearch({ c: "alpha", n: "closed" }), {
      ok: false,
      reason: "server",
    });
    const result = parseInviteSearch({
      c: "alpha",
      n: "closed",
      s: "https://hq.example/api/rtc",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.invite.mode, "closed");
    assert.equal(result.invite.serverAddress, "https://hq.example");
  });
});

describe("buildInviteSearch + invitePath", () => {
  it("keeps world links short", () => {
    const search = buildInviteSearch({
      channelId: "Night Watch",
      mode: "world",
      hostCallsign: "FOX-1",
    });
    assert.equal(invitePath(search), "/?c=night-watch&h=FOX-1");
  });

  it("includes closed server and face", () => {
    const search = buildInviteSearch({
      channelId: "bravo",
      mode: "closed",
      serverAddress: "https://radio.internal",
      hostCallsign: "Nighthawk",
      faceId: "field",
    });
    assert.equal(
      invitePath(search),
      "/?c=bravo&n=closed&s=https%3A%2F%2Fradio.internal&h=Nighthawk&f=field",
    );
  });
});

describe("inviteUrlFromSession", () => {
  it("joins origin and path without a double slash", () => {
    const session: WalkieSession = {
      callsign: "FOX-1",
      channelId: "alpha",
      channelName: "Alpha",
      channelNumber: 2,
      mode: "world",
      serverAddress: "",
      signalingUrl: "/api/rtc",
      viaInvite: false,
      faceId: "steel",
      operatorFace: "fox",
    };
    assert.equal(
      inviteUrlFromSession("https://squelch.example/", session),
      "https://squelch.example/?c=alpha&h=FOX-1&f=steel",
    );
  });
});

describe("share copy order", () => {
  it("puts the link first, then the description", () => {
    assert.equal(
      shareCopyText("https://squelch.example/?c=alpha", "FOX-1 is on Alpha"),
      "https://squelch.example/?c=alpha\nFOX-1 is on Alpha",
    );
    assert.equal(shareCopyText("https://squelch.example/?c=alpha", "  "), "https://squelch.example/?c=alpha");
    assert.equal(shareCopyText("", "FOX-1 is on Alpha"), "FOX-1 is on Alpha");
  });

  it("builds a payload from the live session", () => {
    const session: WalkieSession = {
      callsign: "FOX-1",
      channelId: "alpha",
      channelName: "Alpha",
      channelNumber: 2,
      mode: "world",
      serverAddress: "",
      signalingUrl: "/api/rtc",
      viaInvite: false,
      faceId: "steel",
      operatorFace: "fox",
    };
    assert.equal(shareDescription(session), "FOX-1 is on CH 02 Alpha");
    const payload = sharePayload("https://squelch.example", session);
    assert.equal(payload.url, "https://squelch.example/?c=alpha&h=FOX-1&f=steel");
    assert.equal(payload.description, "FOX-1 is on CH 02 Alpha");
    assert.ok(payload.text.startsWith(payload.url));
    assert.ok(payload.text.endsWith(payload.description));
    assert.equal(payload.text.indexOf(payload.url), 0);
    assert.ok(payload.text.indexOf(payload.description) > payload.url.length);
  });
});

describe("sessionFromInvite", () => {
  it("opens the radio already on the invited channel", () => {
    const parsed = parseInviteSearch({ c: "alpha", h: "FOX-1" });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const result = sessionFromInvite(parsed.invite, "G-AB12");
    assert.ok("session" in result);
    if (!("session" in result)) return;
    assert.equal(result.session.channelId, "alpha");
    assert.equal(result.session.callsign, "G-AB12");
    assert.equal(result.session.viaInvite, true);
    assert.equal(result.session.signalingUrl, "/api/rtc");
  });
});

describe("auto-join from a share link", () => {
  it("should auto-join a valid invite unless the operator left", () => {
    const parsed = parseInviteSearch({ c: "alpha", h: "FOX-1" });
    assert.equal(shouldAutoJoin(parsed, false), true);
    assert.equal(shouldAutoJoin(parsed, true), false);
    assert.equal(shouldAutoJoin({ ok: false, reason: "missing" }, false), false);
  });

  it("reuses a stored callsign and otherwise mints a guest", () => {
    assert.equal(callsignForInvite("FOX-1"), "FOX-1");
    assert.equal(callsignForInvite("x", () => 0), "G-AAAA");
    assert.equal(callsignForInvite("  ", () => 0), "G-AAAA");
  });

  it("lands on the radio with viaInvite set, no tap required", () => {
    const parsed = parseInviteSearch({ c: "bravo", h: "Nighthawk", f: "night" });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const result = autoJoinFromInvite(
      parsed.invite,
      { callsign: "", operatorFace: "owl", faceId: "steel" },
      () => 0,
    );
    assert.ok("session" in result);
    if (!("session" in result)) return;
    assert.equal(result.session.channelId, "bravo");
    assert.equal(result.session.callsign, "G-AAAA");
    assert.equal(result.session.viaInvite, true);
    assert.equal(result.session.operatorFace, "owl");
    assert.equal(result.session.faceId, "night");
  });

  it("keeps the stored housing when the link has no face", () => {
    const parsed = parseInviteSearch({ c: "alpha" });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const result = autoJoinFromInvite(parsed.invite, {
      callsign: "FOX-2",
      operatorFace: "lynx",
      faceId: "brick",
    });
    assert.ok("session" in result);
    if (!("session" in result)) return;
    assert.equal(result.session.callsign, "FOX-2");
    assert.equal(result.session.faceId, "brick");
  });
});

describe("generateGuestCallsign", () => {
  it("uses a G- prefix and four unambiguous chars", () => {
    const callsign = generateGuestCallsign(() => 0);
    assert.equal(callsign, "G-AAAA");
    assert.match(generateGuestCallsign(), /^G-[A-HJ-NP-Z2-9]{4}$/);
  });
});

describe("inviteHeadline", () => {
  it("names the waiting operator when present", () => {
    const parsed = parseInviteSearch({ c: "local", h: "FOX-1" });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(inviteHeadline(parsed.invite), "FOX-1 is on CH 06 Local");
    assert.equal(
      inviteHeadline({ ...parsed.invite, hostCallsign: null }),
      "You're invited to CH 06 Local",
    );
  });
});

describe("default prefs still join without an invite", () => {
  it("keeps callsign empty until typed", () => {
    assert.equal(defaultPrefs().callsign, "");
    assert.equal(defaultPrefs().channel, "world");
  });
});
