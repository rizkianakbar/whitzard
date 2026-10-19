import { useState } from "react";

/**
 * True once `value` differs from what it was on the first render. Entrance animations keyed on a
 * value use it so they play when the value changes, never on page load (which would blink).
 */
export function useChanged<T>(value: T): boolean {
  const [initial, setInitial] = useState<{ value: T } | null>({ value });
  if (initial && !Object.is(initial.value, value)) setInitial(null);
  return initial === null;
}
