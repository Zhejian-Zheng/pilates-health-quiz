import { NextResponse } from "next/server";

import { clearAccountCookie } from "@/lib/account-cookie";
import { clearSessionCookie } from "@/lib/session-cookie";

export const runtime = "nodejs";

export async function POST() {
  const response = new NextResponse(null, { status: 204 });
  clearAccountCookie(response);
  clearSessionCookie(response);

  return response;
}
