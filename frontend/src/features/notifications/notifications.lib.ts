import type { Notification } from "@/lib/api";
import type { Dict, Formatters } from "@/lib/i18n";

/**
 * A notification's title and text in the member's language, built from its type, request and amount.
 * Falls back to the backend's Indonesian text when those aren't enough (rows from before amounts
 * were kept, or a type this client doesn't know yet).
 */
export function notificationText(
  n: Notification,
  { t, fmt }: { t: Dict; fmt: Pick<Formatters, "whzd"> },
): { title: string; description: string } {
  const types = t.notifications.types;
  const id = n.requestId;
  if (id === null) return n;
  switch (n.type) {
    case "request_cancelled":
    case "request_expired":
      return { title: types[n.type].title, description: types[n.type].body(id) };
    default:
      if (n.amount === null || !(n.type in types)) return n;
      return { title: types[n.type].title, description: types[n.type].body(id, fmt.whzd(n.amount)) };
  }
}
