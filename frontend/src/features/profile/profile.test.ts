import { describe, expect, it } from "vitest";

import { MAX_PHOTO, profileSchema } from "@/features/profile/profile.lib";
import { en } from "@/lib/i18n/en";

const text = en.profile.form;
const schema = profileSchema(en, "2026-10-23");
const valid = { displayName: " Rina Puspita ", nickname: "", email: "rina@example.com", city: " ", birthDate: "", photo: null };
const errorsOf = (input: object) => {
  const result = schema.safeParse(input);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path[0], i.message]));
};

describe("profileSchema", () => {
  it("trims, and sends blank optional fields as null", () => {
    expect(schema.parse(valid)).toEqual({
      displayName: "Rina Puspita",
      nickname: null,
      email: "rina@example.com",
      city: null,
      birthDate: null,
      photo: null,
    });
  });

  it("requires a name and a valid email", () => {
    expect(errorsOf({ ...valid, displayName: "  ", email: "" })).toEqual({
      displayName: text.nameRequired,
      email: text.emailRequired,
    });
    expect(errorsOf({ ...valid, email: "rina@" })).toEqual({ email: text.emailInvalid });
  });

  it("allows today as a birth date, not tomorrow", () => {
    expect(errorsOf({ ...valid, birthDate: "2026-10-23" })).toEqual({});
    expect(errorsOf({ ...valid, birthDate: "2026-10-24" })).toEqual({ birthDate: text.birthFuture });
  });

  it("limits the photo to 2 MB", () => {
    const photo = new File([new Uint8Array(MAX_PHOTO + 1)], "me.jpg");
    expect(errorsOf({ ...valid, photo })).toEqual({ photo: text.photoTooLarge });
  });
});
