import { describe, expect, it } from "vitest";

import { isLive, isOpen, percentCollected, shareCells, shortLeft } from "@/features/requests/requests.lib";
import { en } from "@/lib/i18n/en";

describe("isOpen / isLive", () => {
  it("counts a request past its deadline as open but no longer live", () => {
    const awaiting = { status: "funding", awaitingFinalize: true } as const;
    expect(isOpen(awaiting)).toBe(true);
    expect(isLive(awaiting)).toBe(false);
  });

  it("treats finished requests as neither", () => {
    for (const status of ["finalized", "expired", "cancelled"] as const) {
      expect(isOpen({ status })).toBe(false);
      expect(isLive({ status, awaitingFinalize: false })).toBe(false);
    }
  });
});

describe("percentCollected", () => {
  it("rounds down and caps at 100", () => {
    expect(percentCollected({ collected: "1", amount: "3" })).toBe(33);
    expect(percentCollected({ collected: "5", amount: "4" })).toBe(100);
  });

  it("is 0 for a zero amount", () => {
    expect(percentCollected({ collected: "0", amount: "0" })).toBe(0);
  });
});

describe("shareCells", () => {
  const kinds = (cells: ReturnType<typeof shareCells>) => cells.map((c) => (c.you ? `${c.kind}*` : c.kind));

  it("orders others' contributions, the viewer, declines, then no answer", () => {
    expect(kinds(shareCells(6, 2, 2, "pending"))).toEqual(["filled", "filled", "empty*", "declined", "declined", "empty"]);
  });

  it("does not count the viewer's own answer twice", () => {
    expect(kinds(shareCells(4, 2, 1, "contributed"))).toEqual(["filled", "filled*", "declined", "empty"]);
    expect(kinds(shareCells(3, 0, 1, "declined"))).toEqual(["declined*", "empty", "empty"]);
  });

  it("has one cell per member without a viewer", () => {
    expect(shareCells(5, 1, 1, null)).toHaveLength(5);
  });
});

describe("shortLeft", () => {
  it("shows mm:ss in the last hour", () => {
    expect(shortLeft(4 * 60_000 + 32_000, en)).toBe("04:32");
  });

  it("uses the dictionary for longer spans", () => {
    const ms = ((2 * 24 + 4) * 60 + 5) * 60_000;
    expect(shortLeft(ms, en)).toBe(en.countdown.short(2, 4, 5));
  });
});
