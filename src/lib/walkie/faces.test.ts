import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  OPERATOR_FACES,
  RADIO_FACES,
  radioFaceLayout,
  radioFaceName,
  resolveOperatorFace,
  resolveRadioFace,
} from "./faces.ts";
import { buildSession, defaultPrefs } from "./session.ts";

describe("radio faces", () => {
  it("exposes shop, bright, old-time, and rugged housings", () => {
    assert.deepEqual(
      RADIO_FACES.map((f) => f.id),
      ["steel", "field", "night", "brick", "sun", "vintage", "rugged"],
    );
  });

  it("falls back to steel", () => {
    assert.equal(resolveRadioFace("night"), "night");
    assert.equal(resolveRadioFace("nope"), "steel");
    assert.equal(resolveRadioFace(undefined), "steel");
    assert.equal(radioFaceName("field"), "Field");
  });

  it("moves keys with the housing", () => {
    assert.equal(radioFaceLayout("steel"), "stack");
    assert.equal(radioFaceLayout("sun"), "twin");
    assert.equal(radioFaceLayout("vintage"), "top");
    assert.equal(radioFaceLayout("rugged"), "side");
    assert.equal(radioFaceLayout("nope"), "stack");
  });
});

describe("operator faces", () => {
  it("exposes six marks", () => {
    assert.equal(OPERATOR_FACES.length, 6);
    assert.equal(resolveOperatorFace("owl"), "owl");
    assert.equal(resolveOperatorFace(""), "fox");
  });
});

describe("session stores resolved faces", () => {
  it("keeps a valid pair and repairs junk", () => {
    const ok = buildSession({
      ...defaultPrefs(),
      callsign: "FOX-1",
      channel: "alpha",
      faceId: "brick",
      operatorFace: "lynx",
    });
    assert.ok("session" in ok);
    if (!("session" in ok)) return;
    assert.equal(ok.session.faceId, "brick");
    assert.equal(ok.session.operatorFace, "lynx");

    const repaired = buildSession({
      ...defaultPrefs(),
      callsign: "FOX-1",
      channel: "alpha",
      faceId: "plastic",
      operatorFace: "robot",
    });
    assert.ok("session" in repaired);
    if (!("session" in repaired)) return;
    assert.equal(repaired.session.faceId, "steel");
    assert.equal(repaired.session.operatorFace, "fox");
  });
});
