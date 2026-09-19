import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const gmailScope = "https://www.googleapis.com/auth/gmail.modify";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function encryptionKey() {
  return createHash("sha256").update(required("SESSION_SECRET")).digest();
}

export function encryptToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptToken(value: string) {
  const [iv, tag, encrypted] = value.split(".");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

export function googleAuthorizationUrl(state: string) {
  const params = new URLSearchParams({
    client_id: required("GOOGLE_CLIENT_ID"),
    redirect_uri: required("GOOGLE_REDIRECT_URI"),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: `openid email ${gmailScope}`,
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(code: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: required("GOOGLE_CLIENT_ID"),
      client_secret: required("GOOGLE_CLIENT_SECRET"),
      redirect_uri: required("GOOGLE_REDIRECT_URI"),
      grant_type: "authorization_code",
    }),
  });
  const data = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !data.access_token || !data.refresh_token) throw new Error(data.error || "Google authorization failed.");
  return data;
}

export async function saveGmailConnection(input: { email: string; accessToken: string; refreshToken: string; expiresIn: number }) {
  return prisma.gmailConnection.upsert({
    where: { email: input.email },
    update: {
      accessToken: encryptToken(input.accessToken),
      refreshToken: encryptToken(input.refreshToken),
      tokenExpiry: new Date(Date.now() + input.expiresIn * 1000),
    },
    create: {
      email: input.email,
      accessToken: encryptToken(input.accessToken),
      refreshToken: encryptToken(input.refreshToken),
      tokenExpiry: new Date(Date.now() + input.expiresIn * 1000),
    },
  });
}

export async function getGmailConnection() {
  return prisma.gmailConnection.findFirst({ orderBy: { updatedAt: "desc" } });
}

export async function refreshGmailAccessToken(connection: { id: string; refreshToken: string }) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: required("GOOGLE_CLIENT_ID"),
      client_secret: required("GOOGLE_CLIENT_SECRET"),
      refresh_token: decryptToken(connection.refreshToken),
      grant_type: "refresh_token",
    }),
  });
  const data = (await response.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error || "Unable to refresh Gmail access.");
  await prisma.gmailConnection.update({ where: { id: connection.id }, data: { accessToken: encryptToken(data.access_token), tokenExpiry: new Date(Date.now() + (data.expires_in ?? 3600) * 1000) } });
  return data.access_token;
}

export async function gmailAccessToken(connection: Awaited<ReturnType<typeof getGmailConnection>>) {
  if (!connection) throw new Error("Connect a Gmail account first.");
  if (connection.tokenExpiry.getTime() > Date.now() + 60_000) return decryptToken(connection.accessToken);
  return refreshGmailAccessToken(connection);
}

function encodeMessage(value: string) {
  return Buffer.from(value).toString("base64url");
}

export async function sendGmailReply(input: { to: string; subject: string; text: string; inReplyTo?: string }) {
  const connection = await getGmailConnection();
  const token = await gmailAccessToken(connection);
  const raw = [
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    input.inReplyTo ? `In-Reply-To: ${input.inReplyTo}` : "",
    input.inReplyTo ? `References: ${input.inReplyTo}` : "",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    input.text,
  ].filter(Boolean).join("\r\n");
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: encodeMessage(raw) }),
  });
  const data = (await response.json()) as { id?: string; error?: { message?: string } };
  if (!response.ok || !data.id) throw new Error(data.error?.message || "Unable to send Gmail reply.");
  return { providerMessageId: data.id };
}
