import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";

export const ACCOUNT_COOKIE_NAME = "pilates_health_quiz_account";

const ACCOUNT_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function readAccountCookie(request: Request) {
  const cookieValue = readCookie(request, ACCOUNT_COOKIE_NAME);

  if (!cookieValue) {
    return null;
  }

  const [userId, signature] = cookieValue.split(".");

  if (!userId || !signature || !isValidSignature(userId, signature)) {
    return null;
  }

  return userId;
}

export function setAccountCookie(response: NextResponse, userId: string) {
  response.cookies.set({
    name: ACCOUNT_COOKIE_NAME,
    value: `${userId}.${sign(userId)}`,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCOUNT_COOKIE_MAX_AGE,
  });
}

export function clearAccountCookie(response: NextResponse) {
  response.cookies.set({
    name: ACCOUNT_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

function readCookie(request: Request, cookieName: string) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = cookie.trim().split("=");

    if (rawName === cookieName) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return null;
}

function isValidSignature(value: string, signature: string) {
  const expectedSignature = sign(value);
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

function sign(value: string) {
  return createHmac("sha256", getCookieSecret()).update(value).digest("base64url");
}

function getCookieSecret() {
  return (
    process.env.AUTH_COOKIE_SECRET ||
    process.env.DATABASE_URL ||
    "pilates-health-quiz-development-auth-secret"
  );
}
