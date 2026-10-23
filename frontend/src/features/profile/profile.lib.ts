import { z } from "zod";

import type { Dict } from "@/lib/i18n";

export const MAX_PHOTO = 2 * 1024 * 1024;
export const PHOTO_TYPES = "image/png,image/jpeg,image/webp";

/** Blank optional text is sent as null. */
const optionalText = z
  .string()
  .trim()
  .transform((value) => value || null);

/** The profile form. `today` is YYYY-MM-DD, the latest allowed birth date. */
export function profileSchema(t: Dict, today: string) {
  const text = t.profile.form;
  return z.object({
    displayName: z.string().trim().min(1, text.nameRequired),
    nickname: optionalText,
    email: z.string().trim().min(1, text.emailRequired).pipe(z.email(text.emailInvalid)),
    city: optionalText,
    birthDate: z
      .string()
      .refine((date) => !date || date <= today, text.birthFuture)
      .transform((date) => date || null),
    photo: z
      .instanceof(File)
      .refine((file) => file.size <= MAX_PHOTO, text.photoTooLarge)
      .nullable(),
  });
}

export type ProfileValues = z.output<ReturnType<typeof profileSchema>>;
