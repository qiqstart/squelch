import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bootLabel, bootPhaseAt, shouldShowBoot, totalBootMs } from "./boot.ts";

describe("radio boot sequence", () => {
  it("steps through PWR, identity, scan, then OPEN", () => {
    assert.equal(bootPhaseAt(0), "pwr");
    assert.equal(bootPhaseAt(300), "id");
    assert.equal(bootLabel("id"), "SQUELCH");
    assert.equal(bootLabel("scan", "CH 02"), "CH 02");
    assert.equal(bootPhaseAt(totalBootMs() + 10), "open");
    assert.equal(bootLabel("open"), "OPEN");
  });

  it("holds the screen until the animation finishes, then until linked", () => {
    assert.equal(shouldShowBoot(0, false), true);
    assert.equal(shouldShowBoot(totalBootMs() - 1, true), true);
    assert.equal(shouldShowBoot(totalBootMs() + 1, true), false);
    assert.equal(shouldShowBoot(totalBootMs() + 1, false), true);
    assert.equal(shouldShowBoot(10_000, false), false);
  });
});
