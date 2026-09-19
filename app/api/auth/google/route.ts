import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { googleAuthorizationUrl } from "@/lib/gmail";

export async function GET() {
  if (process.env.DEMO_MODE === "true") {
    return NextResponse.json({ error: "Gmail connection is disabled in portfolio demo mode." }, { status: 403 });
  }

  const state = randomBytes(24).toString("hex");
  const response = NextResponse.redirect(googleAuthorizationUrl(state));
  response.cookies.set("google_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });
  return response;
}
