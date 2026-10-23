import { describe, expect, it } from "vitest";

import { COMMENT_MAX, commentLength, commentSchema, sha256Hex } from "@/features/request-detail/request-detail.lib";

describe("sha256Hex", () => {
  it("hashes a document the way the evidence hash is stored on-chain", async () => {
    expect(await sha256Hex(new Blob(["abc"]))).toBe("0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("commentSchema", () => {
  it("trims, and rejects an empty comment", () => {
    expect(commentSchema.parse({ body: "  thanks!  " })).toEqual({ body: "thanks!" });
    expect(commentSchema.safeParse({ body: "   " }).success).toBe(false);
  });

  it("counts characters as the backend does, so emoji count once", () => {
    expect(commentLength("🙏🙏")).toBe(2);
    expect(commentSchema.safeParse({ body: "🙏".repeat(COMMENT_MAX) }).success).toBe(true);
    expect(commentSchema.safeParse({ body: "a".repeat(COMMENT_MAX + 1) }).success).toBe(false);
  });
});
