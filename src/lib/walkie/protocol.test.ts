import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isHelloWire,
  isPttWire,
  isRogerWire,
  isValidSignalId,
  isValidSignalPayload,
  MAX_SIGNAL_PAYLOAD_BYTES,
  sanitizeCallsign,
  sanitizeChannelId,
} from "./protocol.ts";

describe("signal ids", () => {
  it("accepts room-safe ids", () => {
    assert.equal(isValidSignalId("world"), true);
    assert.equal(isValidSignalId("night-watch"), true);
    assert.equal(isValidSignalId("p-ab12cd34"), true);
    assert.equal(isValidSignalId("A_1"), true);
  });

  it("rejects empty, long, or dirty ids", () => {
    assert.equal(isValidSignalId(""), false);
    assert.equal(isValidSignalId("has space"), false);
    assert.equal(isValidSignalId("bad/slash"), false);
    assert.equal(isValidSignalId("a".repeat(65)), false);
  });
});

describe("payload cap", () => {
  it("rejects undefined and oversized blobs", () => {
    assert.equal(isValidSignalPayload(undefined), false);
    assert.equal(isValidSignalPayload({ ok: true }), true);
    assert.equal(isValidSignalPayload("x".repeat(MAX_SIGNAL_PAYLOAD_BYTES + 1)), false);
  });
});

describe("sanitizeCallsign", () => {
  it("trims and caps length", () => {
    assert.equal(sanitizeCallsign("  FOX-1  "), "FOX-1");
    assert.equal(sanitizeCallsign("ab"), "ab");
    assert.equal(sanitizeCallsign("a"), null);
    assert.equal(sanitizeCallsign("   "), null);
    assert.equal(sanitizeCallsign("n".repeat(40))?.length, 24);
  });
});

describe("sanitizeChannelId", () => {
  it("slugs free text into a room id", () => {
    assert.equal(sanitizeChannelId("Night Watch"), "night-watch");
    assert.equal(sanitizeChannelId("  ALPHA  "), "alpha");
    assert.equal(sanitizeChannelId("***"), null);
    assert.equal(sanitizeChannelId(""), null);
  });
});

describe("isPttWire", () => {
  it("accepts only { type: ptt, on: boolean }", () => {
    assert.equal(isPttWire({ type: "ptt", on: true }), true);
    assert.equal(isPttWire({ type: "ptt", on: false }), true);
    assert.equal(isPttWire({ type: "ptt" }), false);
    assert.equal(isPttWire({ type: "chat", on: true }), false);
    assert.equal(isPttWire(null), false);
  });
});

describe("isHelloWire", () => {
  it("accepts invite and direct hellos", () => {
    assert.equal(isHelloWire({ type: "hello", via: "invite" }), true);
    assert.equal(isHelloWire({ type: "hello", via: "direct", face: "fox" }), true);
    assert.equal(isHelloWire({ type: "hello", via: "other" }), false);
    assert.equal(isHelloWire({ type: "hello" }), false);
  });
});

describe("isRogerWire", () => {
  it("accepts a roger beep marker", () => {
    assert.equal(isRogerWire({ type: "roger" }), true);
    assert.equal(isRogerWire({ type: "ptt", on: false }), false);
  });
});
