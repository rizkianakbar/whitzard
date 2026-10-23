import { describe, expect, it } from "vitest";

import { initials, shortAddress } from "@/lib/format";

describe("shortAddress", () => {
  it("shortens to checksummed case", () => {
    expect(shortAddress("0x70997970c51812dc3a010c7d01b50e0d17dc79c8")).toBe("0x7099…79C8");
  });

  it("shortens other hex (transaction hashes) as is", () => {
    expect(shortAddress(`0x${"ab".repeat(32)}`)).toBe("0xabab…abab");
  });
});

describe("initials", () => {
  it("takes the first letter of the first two names", () => {
    expect(initials("rina puspita sari")).toBe("RP");
    expect(initials("  Budi ")).toBe("B");
  });

  it("is null without a name", () => {
    expect(initials("   ")).toBeNull();
    expect(initials(null)).toBeNull();
  });
});
