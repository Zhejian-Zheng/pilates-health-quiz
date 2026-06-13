import type { AuthProfile } from "@/lib/quiz-types";

export function isVipMember(
  authProfile: AuthProfile | null | undefined,
  subscriptionStatus: string | null | undefined,
) {
  return (
    authProfile !== null &&
    authProfile !== undefined &&
    authProfile.mode !== "guest" &&
    subscriptionStatus === "ACTIVE"
  );
}
