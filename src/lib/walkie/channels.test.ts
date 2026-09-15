import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  channelDisplayName,
  channelNumber,
  formatChannelDial,
  formatChannelLabel,
  hashChannelNumber,
  isPublicChannel,
  mergeOccupancy,
  PUBLIC_CHANNELS,
  publicChannelByNumber,
  resolveChannel,
} from "./channels.ts";

describe("public channels", () => {
  it("exposes a stable world channel as CH 01", () => {
    assert.equal(PUBLIC_CHANNELS[0]?.id, "world");
    assert.equal(PUBLIC_CHANNELS[0]?.number, 1);
    assert.equal(isPublicChannel("alpha"), true);
    assert.equal(isPublicChannel("night-watch"), false);
    assert.deepEqual(
      PUBLIC_CHANNELS.map((c) => c.number),
      [1, 2, 3, 4, 5, 6],
    );
  });

  it("titles known and custom rooms", () => {
    assert.equal(channelDisplayName("bravo"), "Bravo");
    assert.equal(channelDisplayName("night-watch"), "Night Watch");
  });

  it("resolves names, slugs, and channel numbers", () => {
    assert.deepEqual(resolveChannel("Local"), { id: "local", name: "Local", number: 6 });
    assert.deepEqual(resolveChannel("1"), { id: "world", name: "World", number: 1 });
    assert.deepEqual(resolveChannel("02"), { id: "alpha", name: "Alpha", number: 2 });
    assert.equal(resolveChannel("???"), null);
    const custom = resolveChannel("Night Watch");
    assert.equal(custom?.id, "night-watch");
    assert.equal(custom?.name, "Night Watch");
    assert.equal(custom?.number, hashChannelNumber("night-watch"));
    assert.ok(custom && custom.number >= 7 && custom.number <= 22);
  });

  it("keeps private numbers stable", () => {
    assert.equal(hashChannelNumber("night-watch"), hashChannelNumber("night-watch"));
    assert.notEqual(hashChannelNumber("night-watch"), hashChannelNumber("dawn-watch"));
  });

  it("formats the dial the way a handheld would", () => {
    assert.equal(formatChannelDial("world"), "CH 01");
    assert.equal(formatChannelDial(3), "CH 03");
    assert.equal(formatChannelLabel("alpha"), "CH 02 Alpha");
    assert.equal(channelNumber("delta"), 5);
    assert.equal(publicChannelByNumber("6")?.id, "local");
    assert.equal(publicChannelByNumber("99"), undefined);
  });

  it("merges occupancy onto the public list", () => {
    const merged = mergeOccupancy([
      { id: "world", listeners: 3 },
      { id: "secret", listeners: 2 },
    ]);
    assert.equal(merged.find((c) => c.id === "world")?.listeners, 3);
    assert.equal(merged.find((c) => c.id === "alpha")?.listeners, 0);
    assert.equal(merged.find((c) => c.id === "alpha")?.number, 2);
    assert.equal(merged.some((c) => c.id === "secret"), false);
  });
});
