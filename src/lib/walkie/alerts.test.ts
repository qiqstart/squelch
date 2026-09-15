import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatReadyMessage,
  makeReadyAlert,
  markAnnounced,
  newlyConnectedIds,
  notificationPayload,
  postReadyNotification,
  requestNotifyPermission,
  shouldAnnounce,
} from "./alerts.ts";

describe("formatReadyMessage", () => {
  it("calls out invitees who used the share link", () => {
    assert.equal(
      formatReadyMessage("Nighthawk", true),
      "Nighthawk used your link — ready to talk",
    );
    assert.equal(formatReadyMessage("FOX-2", false), "FOX-2 is ready to talk");
    assert.equal(formatReadyMessage("  ", true), "An operator used your link — ready to talk");
  });
});

describe("newlyConnectedIds", () => {
  it("returns only peers that just became connected", () => {
    assert.deepEqual(newlyConnectedIds(["a"], ["a", "b"]), ["b"]);
    assert.deepEqual(newlyConnectedIds(["a", "b"], ["a"]), []);
    assert.deepEqual(newlyConnectedIds([], ["p-1"]), ["p-1"]);
  });
});

describe("announce once", () => {
  it("skips a peer already announced", () => {
    const seen = new Set(["p-1"]);
    assert.equal(shouldAnnounce("p-1", seen), false);
    assert.equal(shouldAnnounce("p-2", seen), true);
    const next = markAnnounced("p-2", seen);
    assert.equal(next.has("p-2"), true);
    assert.equal(seen.has("p-2"), false);
  });
});

describe("browser notification payload", () => {
  it("tags per operator so repeats collapse", () => {
    const alert = makeReadyAlert({ id: "p-9", name: "FOX-1", viaInvite: true });
    assert.deepEqual(notificationPayload(alert), {
      title: "Squelch",
      body: "FOX-1 used your link — ready to talk",
      tag: "squelch-p-9",
    });
  });

  it("posts only when a notify fn is available", () => {
    const alert = makeReadyAlert({ id: "p-9", name: "FOX-1", viaInvite: true });
    const calls: unknown[] = [];
    assert.equal(postReadyNotification(alert, null), false);
    assert.equal(
      postReadyNotification(alert, (title, options) => {
        calls.push([title, options]);
      }),
      true,
    );
    assert.deepEqual(calls, [
      ["Squelch", { body: "FOX-1 used your link — ready to talk", tag: "squelch-p-9" }],
    ]);
  });
});

describe("requestNotifyPermission", () => {
  it("returns unsupported without an API", async () => {
    assert.equal(await requestNotifyPermission(undefined), "unsupported");
  });

  it("short-circuits granted and denied", async () => {
    assert.equal(
      await requestNotifyPermission({
        permission: "granted",
        requestPermission: async () => "denied",
      }),
      "granted",
    );
    assert.equal(
      await requestNotifyPermission({
        permission: "denied",
        requestPermission: async () => "granted",
      }),
      "denied",
    );
  });

  it("asks when permission is default", async () => {
    assert.equal(
      await requestNotifyPermission({
        permission: "default",
        requestPermission: async () => "granted",
      }),
      "granted",
    );
  });
});
