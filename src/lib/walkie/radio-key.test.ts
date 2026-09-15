import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shareKeyLabel } from "./keys.ts";

describe("shareKeyLabel", () => {
  it("stamps SHARE, OK, or ERR on the hardware key", () => {
    assert.equal(shareKeyLabel("idle"), "SHARE");
    assert.equal(shareKeyLabel("copied"), "OK");
    assert.equal(shareKeyLabel("failed"), "ERR");
  });
});
