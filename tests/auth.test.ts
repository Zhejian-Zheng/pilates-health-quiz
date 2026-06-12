import { NextResponse } from "next/server";
import { describe, expect, it } from "vitest";

import {
  ACCOUNT_COOKIE_NAME,
  readAccountCookie,
  setAccountCookie,
} from "../src/lib/account-cookie";
import { hashPassword, verifyPassword } from "../src/lib/password";
import { authSchema } from "../src/lib/schemas";

describe("password hashing", () => {
  it("verifies the original password and rejects the wrong one", async () => {
    const passwordHash = await hashPassword("correct-horse");

    expect(passwordHash).not.toContain("correct-horse");
    await expect(verifyPassword("correct-horse", passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-horse", passwordHash)).resolves.toBe(false);
  });
});

describe("account cookies", () => {
  it("accepts signed account cookies and rejects tampered values", () => {
    const response = NextResponse.json({});
    setAccountCookie(response, "user_123");

    const setCookie = response.headers.get("set-cookie") ?? "";
    const cookie = setCookie.split(";")[0];
    const request = new Request("http://test.local", {
      headers: {
        cookie,
      },
    });

    expect(readAccountCookie(request)).toBe("user_123");

    const tamperedRequest = new Request("http://test.local", {
      headers: {
        cookie: `${ACCOUNT_COOKIE_NAME}=user_456.${cookie.split(".")[1]}`,
      },
    });

    expect(readAccountCookie(tamperedRequest)).toBeNull();
  });
});

describe("auth schema", () => {
  it("normalizes email and treats an empty display name as omitted", () => {
    expect(
      authSchema.parse({
        displayName: "",
        email: " Test@Example.COM ",
        password: "secret1",
      }),
    ).toEqual({
      displayName: undefined,
      email: "test@example.com",
      password: "secret1",
    });
  });
});
