import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isSameOriginSignaling,
  normalizeOrigin,
  resolveChannelsUrl,
  resolveSignalingUrl,
  ServerAddressError,
} from "./server.ts";

describe("normalizeOrigin", () => {
  it("accepts a host and forces https", () => {
    assert.equal(normalizeOrigin("squelch.example.com"), "https://squelch.example.com");
  });

  it("keeps an explicit scheme and strips a path", () => {
    assert.equal(
      normalizeOrigin("https://squelch.example.com/api/rtc"),
      "https://squelch.example.com",
    );
    assert.equal(normalizeOrigin("http://10.0.0.5:8080"), "http://10.0.0.5:8080");
  });

  it("rejects junk", () => {
    assert.throws(() => normalizeOrigin(""), ServerAddressError);
    assert.throws(() => normalizeOrigin("not a host because spaces"), ServerAddressError);
  });
});

describe("resolve urls", () => {
  it("uses relative paths on the world net", () => {
    assert.equal(resolveSignalingUrl("world", ""), "/api/rtc");
    assert.equal(resolveChannelsUrl("world", ""), "/api/channels");
    assert.equal(isSameOriginSignaling("/api/rtc"), true);
  });

  it("points closed mode at the given origin", () => {
    assert.equal(
      resolveSignalingUrl("closed", "https://radio.internal"),
      "https://radio.internal/api/rtc",
    );
    assert.equal(
      resolveChannelsUrl("closed", "radio.internal"),
      "https://radio.internal/api/channels",
    );
    assert.equal(isSameOriginSignaling("https://radio.internal/api/rtc"), false);
  });
});
