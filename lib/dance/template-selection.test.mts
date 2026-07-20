import assert from "node:assert/strict";
import test from "node:test";

import { getInitialTemplateId } from "./template-selection.ts";

test("accepts only an existing public query template", () => {
  assert.equal(getInitialTemplateId("k-pop", [{ id: "hip-hop" }, { id: "k-pop" }]), "k-pop");
  assert.equal(getInitialTemplateId("../../secret", [{ id: "hip-hop" }]), "hip-hop");
  assert.equal(
    getInitialTemplateId("internal", [
      { id: "internal", isPublic: false },
      { id: "hip-hop", isPublic: true },
    ]),
    "hip-hop",
  );
});

test("falls back to the first public template for missing or repeated query values", () => {
  const templates = [{ id: "hip-hop" }, { id: "k-pop" }];

  assert.equal(getInitialTemplateId(undefined, templates), "hip-hop");
  assert.equal(getInitialTemplateId(["k-pop", "hip-hop"], templates), "hip-hop");
});
