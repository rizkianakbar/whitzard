import { useState } from "react";

type Errors<K extends string> = Partial<Record<K, string>>;

/**
 * Form errors that are "late to scold, quick to forgive":
 * - nothing is flagged until the first submit, so an untouched form isn't covered in red;
 * - a field that shows an error is re-checked as you type, so it clears the moment it's fixed;
 * - after the first submit, leaving a field re-checks it, so emptying it again is flagged on blur.
 *
 * `check` returns the field's message, or null when it's fine. It receives the values to check,
 * so a change can be validated with the new value before React has re-rendered.
 */
export function useFieldErrors<V extends Record<string, unknown>>(
  values: V,
  check: (field: keyof V & string, values: V) => string | null,
) {
  type K = keyof V & string;
  const [errors, setErrors] = useState<Errors<K>>({});
  const [submitted, setSubmitted] = useState(false);

  const set = (field: K, message: string | null) =>
    setErrors((current) => {
      if ((current[field] ?? null) === message) return current;
      const next = { ...current };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });

  return {
    errors,
    /** On submit: checks every field and shows all messages. True when the form is valid. */
    validateAll(): boolean {
      setSubmitted(true);
      const next: Errors<K> = {};
      for (const field of Object.keys(values) as K[]) {
        const message = check(field, values);
        if (message) next[field] = message;
      }
      setErrors(next);
      return Object.keys(next).length === 0;
    },
    /** While typing. `commit` (a picked file, a chosen option) checks right away once submitted. */
    change(field: K, value: V[K], { commit = false } = {}) {
      if (errors[field] || (commit && submitted)) set(field, check(field, { ...values, [field]: value }));
    },
    /** On leaving a field. */
    blur(field: K) {
      if (submitted) set(field, check(field, values));
    },
  };
}
