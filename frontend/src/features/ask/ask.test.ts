import { parseEther } from "viem";
import { describe, expect, it } from "vitest";

import { askSchema, MAX_BYTES, parseAmount } from "@/features/ask/ask.lib";
import { en } from "@/lib/i18n/en";

describe("parseAmount", () => {
  it.each([
    ["300", "300"],
    ["12.5", "12.5"],
    ["12,5", "12.5"],
    ["1.000,5", "1000.5"],
    [" 7 ", "7"],
    ["0.000000000000000001", "0.000000000000000001"],
  ])("reads %j as %s WHZD", (input, whzd) => {
    expect(parseAmount(input)).toBe(parseEther(whzd));
  });

  it.each(["", "0", "0,0", "-5", "abc", "1e3", "12.", "0.0000000000000000001"])("rejects %j", (input) => {
    expect(parseAmount(input)).toBeNull();
  });
});

describe("askSchema", () => {
  const t = en;
  const file = new File(["%PDF"], "bill.pdf", { type: "application/pdf" });
  const valid = { title: "  Surgery  ", description: "For my mother's surgery.", amount: "300", duration: "86400", file };
  const errorsOf = (members: number | undefined, input: object) => {
    const result = askSchema(t, members).safeParse(input);
    return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path[0], i.message]));
  };

  it("parses into what openRequest needs", () => {
    expect(askSchema(t, 3).parse(valid)).toEqual({ ...valid, title: "Surgery", amount: parseEther("300"), duration: 86400 });
  });

  it("explains every missing field in the member's language", () => {
    expect(errorsOf(3, { title: " ", description: "", amount: "", duration: "86400", file: undefined })).toEqual({
      title: t.ask.errors.title,
      description: t.ask.errors.description,
      amount: t.ask.errors.amount,
      file: t.ask.errors.file,
    });
  });

  it("rejects a long title and a large document", () => {
    const large = new File([new Uint8Array(MAX_BYTES + 1)], "scan.png");
    expect(errorsOf(3, { ...valid, title: "x".repeat(121), file: large })).toEqual({
      title: t.ask.errors.titleLong,
      file: t.ask.errors.fileLarge,
    });
  });

  it("says when nobody could share the request, but not while still counting", () => {
    expect(errorsOf(0, valid)).toEqual({ amount: t.ask.errors.noMembers });
    expect(errorsOf(undefined, valid)).toEqual({});
  });
});
