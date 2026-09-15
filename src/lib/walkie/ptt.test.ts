import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { barsFromLevel, peakLevel, shouldTransmit } from "./ptt.ts";

describe("shouldTransmit", () => {
  it("requires a live mic and a held control", () => {
    assert.equal(shouldTransmit({ pointerDown: true, spaceDown: false, micReady: true }), true);
    assert.equal(shouldTransmit({ pointerDown: false, spaceDown: true, micReady: true }), true);
    assert.equal(shouldTransmit({ pointerDown: true, spaceDown: true, micReady: false }), false);
    assert.equal(shouldTransmit({ pointerDown: false, spaceDown: false, micReady: true }), false);
  });
});

describe("peakLevel", () => {
  it("is 0 for silence and 1 for a full swing", () => {
    assert.equal(peakLevel(Uint8Array.from([128, 128, 128])), 0);
    assert.equal(peakLevel(Uint8Array.from([128, 255])), 127 / 128);
    assert.equal(peakLevel(Uint8Array.from([0])), 1);
  });
});

describe("barsFromLevel", () => {
  it("lights a prefix of bars", () => {
    assert.deepEqual(barsFromLevel(0, 4), [false, false, false, false]);
    assert.deepEqual(barsFromLevel(1, 4), [true, true, true, true]);
    assert.deepEqual(barsFromLevel(0.5, 4), [true, true, false, false]);
  });
});
