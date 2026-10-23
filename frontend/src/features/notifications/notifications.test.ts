import { describe, expect, it } from "vitest";

import { notificationText } from "@/features/notifications/notifications.lib";
import type { Notification } from "@/lib/api";
import { en } from "@/lib/i18n/en";

const i18n = { t: en, fmt: { whzd: (amount: string | bigint) => `<${amount}>` } };

const notification = (overrides: Partial<Notification>): Notification => ({
  id: 1,
  type: "request_opened",
  title: "Backend title",
  description: "Backend text",
  requestId: 7,
  amount: "30",
  isRead: false,
  createdAt: "2026-10-01T00:00:00Z",
  ...overrides,
});

describe("notificationText", () => {
  it("writes the text in the member's language from type, request and amount", () => {
    expect(notificationText(notification({}), i18n)).toEqual({
      title: "Someone needs help",
      description: "Request #7 asks each member for <30> WHZD.",
    });
  });

  it("needs no amount for a cancelled or expired request", () => {
    expect(notificationText(notification({ type: "request_expired", amount: null }), i18n).title).toBe("Request ended");
  });

  it("falls back to the backend's text when it can't write its own", () => {
    const fallback = { title: "Backend title", description: "Backend text" };
    expect(notificationText(notification({ amount: null }), i18n)).toMatchObject(fallback);
    expect(notificationText(notification({ requestId: null }), i18n)).toMatchObject(fallback);
  });
});
