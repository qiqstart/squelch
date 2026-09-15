import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  JOIN_CHIRP,
  STATIC_CHIRP,
  joinTonesForSound,
  isNoiseStep,
  playToneSequence,
  RELEASE_TONES,
  ROGER_BEEP,
  rogerOnRelease,
  resolveSound,
  scheduleTones,
  SOUND_PRESETS,
  tonesForSound,
} from "./tones.ts";

describe("rogerOnRelease", () => {
  it("fires only on the falling edge of PTT", () => {
    assert.equal(rogerOnRelease(true, false), true);
    assert.equal(rogerOnRelease(false, false), false);
    assert.equal(rogerOnRelease(true, true), false);
    assert.equal(rogerOnRelease(false, true), false);
  });
});

describe("roger beep", () => {
  it("is a short high square tone in the classic handheld band", () => {
    assert.equal(ROGER_BEEP.length, 1);
    const beep = ROGER_BEEP[0]!;
    assert.equal(beep.type, "square");
    assert.ok(beep.freq >= 1500 && beep.freq <= 2000);
    assert.ok(beep.durationMs >= 60 && beep.durationMs <= 150);
  });

  it("schedules a click then the beep on release", () => {
    const scheduled = scheduleTones(RELEASE_TONES);
    assert.ok(scheduled.length >= 2);
    assert.ok(scheduled[0]!.freq < 400);
    assert.equal(scheduled[0]!.atMs, 0);
    const beep = scheduled.find((s) => s.freq === ROGER_BEEP[0]!.freq);
    assert.ok(beep);
    assert.ok(beep!.atMs > 0);
  });
});

describe("sound presets", () => {
  it("includes silent and a chirp of static", () => {
    assert.deepEqual(
      SOUND_PRESETS.map((s) => s.id),
      ["roger", "static", "click", "silent"],
    );
    assert.equal(resolveSound("static"), "static");
    assert.equal(resolveSound("nope"), "roger");
    assert.equal(tonesForSound("silent").length, 0);
    assert.equal(tonesForSound("click").length, 1);
    assert.equal(isNoiseStep(STATIC_CHIRP[0]!), true);
    assert.equal(isNoiseStep(tonesForSound("static")[0]!), true);
    assert.equal(joinTonesForSound("silent").length, 0);
    assert.deepEqual(joinTonesForSound("roger"), JOIN_CHIRP);
  });
});

describe("join chirp", () => {
  it("rises in pitch so it is distinct from roger", () => {
    assert.ok(JOIN_CHIRP[0]!.freq < JOIN_CHIRP[1]!.freq);
    assert.ok(JOIN_CHIRP[0]!.freq < 1000);
  });
});

describe("playToneSequence", () => {
  it("no-ops without an audio context or when silent", () => {
    assert.equal(playToneSequence(null, ROGER_BEEP), false);
    assert.equal(playToneSequence(null, tonesForSound("silent")), false);
  });
});
