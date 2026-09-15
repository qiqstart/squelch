import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  channelDisplayName,
  isPublicChannel,
  mergeOccupancy,
  PUBLIC_CHANNELS,
  resolveChannel,
} from "./channels.ts";

describe("public channels", () => {
  it("exposes a stable world channel", () => {
    assert.equal(PUBLIC_CHANNELS[0]?.id, "world");
    assert.equal(isPublicChannel("alpha"), true);
    assert.equal(isPublicChannel("night-watch"), false);
  });

  it("titles known and custom rooms", () => {
    assert.equal(channelDisplayName("bravo"), "Bravo");
    assert.equal(channelDisplayName("night-watch"), "Night Watch");
  });

  it("resolves or rejects a typed room", () => {
    assert.deepEqual(resolveChannel("Local"), { id: "local", name: "Local" });
    assert.equal(resolveChannel("???"), null);
  });

  it("merges occupancy onto the public list", () => {
    const merged = mergeOccupancy([
      { id: "world", listeners: 3 },
      { id: "secret", listeners: 2 },
    ]);
    assert.equal(merged.find((c) => c.id === "world")?.listeners, 3);
    assert.equal(merged.find((c) => c.id === "alpha")?.listeners, 0);
    assert.equal(merged.some((c) => c.id === "secret"), false);
  });
});
