import assert from "node:assert/strict";
import test from "node:test";

import { getCreemModerationDecision } from "./creem-moderation-decision.ts";

test("reads allow moderation decisions", () => {
  assert.equal(getCreemModerationDecision({ decision: "allow" }), "allow");
});

test("reads flag moderation decisions as a blockable decision", () => {
  assert.equal(getCreemModerationDecision({ decision: "flag" }), "flag");
});

test("reads deny moderation decisions as a blockable decision", () => {
  assert.equal(getCreemModerationDecision({ decision: "deny" }), "deny");
});

test("fails closed on unknown moderation decisions", () => {
  assert.equal(getCreemModerationDecision({ decision: "review" }), null);
  assert.equal(getCreemModerationDecision({}), null);
});
