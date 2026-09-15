import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSession, defaultPrefs } from "./session.ts";

describe("buildSession", () => {
  it("joins the world net on a public channel", () => {
    const result = buildSession({
      ...defaultPrefs(),
      callsign: "FOX-1",
      channel: "alpha",
      mode: "world",
    });
    assert.ok("session" in result);
    if (!("session" in result)) return;
    assert.equal(result.session.callsign, "FOX-1");
    assert.equal(result.session.channelId, "alpha");
    assert.equal(result.session.channelName, "Alpha");
    assert.equal(result.session.signalingUrl, "/api/rtc");
    assert.equal(result.session.viaInvite, false);
    assert.equal(result.session.faceId, "steel");
  });

  it("slugs a private channel name", () => {
    const result = buildSession({
      ...defaultPrefs(),
      callsign: "Nighthawk",
      channel: "Night Watch",
      mode: "world",
    });
    assert.ok("session" in result);
    if (!("session" in result)) return;
    assert.equal(result.session.channelId, "night-watch");
  });

  it("requires a server on closed mode", () => {
    const result = buildSession({
      ...defaultPrefs(),
      callsign: "FOX-1",
      channel: "world",
      mode: "closed",
      serverAddress: "",
    });
    assert.ok("errors" in result);
    if (!("errors" in result)) return;
    assert.equal(result.errors.some((e) => e.field === "server"), true);
  });

  it("points closed mode at the remote rtc path", () => {
    const result = buildSession({
      ...defaultPrefs(),
      callsign: "FOX-1",
      channel: "bravo",
      mode: "closed",
      serverAddress: "https://hq.example",
    });
    assert.ok("session" in result);
    if (!("session" in result)) return;
    assert.equal(result.session.signalingUrl, "https://hq.example/api/rtc");
    assert.equal(result.session.mode, "closed");
  });

  it("rejects a short callsign", () => {
    const result = buildSession({ ...defaultPrefs(), callsign: "x", channel: "world" });
    assert.ok("errors" in result);
  });
});
