import { describe, expect, it } from "vitest";

import { isVipMember } from "../src/lib/membership";
import type { AuthProfile } from "../src/lib/quiz-types";

const loggedInUser: AuthProfile = {
  mode: "login",
  displayName: "Kevin",
  email: "kevin@example.com",
};

const guestUser: AuthProfile = {
  mode: "guest",
  displayName: "Guest",
};

describe("isVipMember", () => {
  it("marks a logged-in user with an active subscription as VIP", () => {
    expect(isVipMember(loggedInUser, "ACTIVE")).toBe(true);
  });

  it.each(["INACTIVE", "TRIALING", "PAST_DUE", "CANCELED", "EXPIRED"])(
    "does not mark %s subscriptions as VIP",
    (subscriptionStatus) => {
      expect(isVipMember(loggedInUser, subscriptionStatus)).toBe(false);
    },
  );

  it("does not show VIP for guests even if the current session is active", () => {
    expect(isVipMember(guestUser, "ACTIVE")).toBe(false);
  });

  it("does not show VIP when no auth profile is available", () => {
    expect(isVipMember(null, "ACTIVE")).toBe(false);
  });
});
