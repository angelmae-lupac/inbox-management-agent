import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeGoogleCode, saveGmailConnection } from "@/lib/gmail";

export async function GET(request: Request) {
  if (process.env.DEMO_MODE === "true") {
    return NextResponse.json({ error: "Gmail connection is disabled in portfolio demo mode." }, { status: 403 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google_oauth_state")?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.json({ error: "Invalid Google OAuth response." }, { status: 400 });
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    if (!tokens.access_token || !tokens.refresh_token) throw new Error("Google did not return the required tokens.");
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    const profile = (await profileResponse.json()) as { email?: string };
    if (!profile.email) throw new Error("Google did not return an email address.");
    await saveGmailConnection({ email: profile.email, accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresIn: tokens.expires_in ?? 3600 });
    cookieStore.delete("google_oauth_state");
    return NextResponse.redirect(new URL("/?gmail=connected", request.url));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to connect Gmail." }, { status: 500 });
  }
}
