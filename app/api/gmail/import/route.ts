import { NextResponse } from "next/server";
import { analyzeMessageWithGemini } from "@/lib/gemini";
import { getGmailConnection, gmailAccessToken } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";
import { saveActivityLog, saveMessageAnalysis } from "@/lib/inbox-data";

function decodeBase64(value: string) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

type GmailPart = { mimeType?: string; body?: { data?: string }; parts?: GmailPart[] };

function findBody(payload: { body?: { data?: string }; parts?: GmailPart[] }): string {
  if (payload.body?.data) return decodeBase64(payload.body.data);
  for (const part of payload.parts ?? []) {
    if (part.mimeType === "text/plain" && part.body?.data) return decodeBase64(part.body.data);
    if (part.parts) {
      const nested = findBody(part);
      if (nested) return nested;
    }
  }
  return "(Message body unavailable)";
}

function header(headers: Array<{ name?: string; value?: string }> | undefined, name: string) {
  return headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function sender(value: string) {
  const match = value.match(/^(.*?)\s*<([^>]+)>$/);
  return { name: match?.[1]?.replace(/^"|"$/g, "").trim() || value, email: match?.[2]?.trim() || value };
}

export async function POST() {
  if (process.env.DEMO_MODE === "true") {
    return NextResponse.json({ success: false, error: "Gmail import is disabled in portfolio demo mode." }, { status: 403 });
  }

  try {
    const connection = await getGmailConnection();
    const token = await gmailAccessToken(connection);
    const listResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=in:inbox", { headers: { Authorization: `Bearer ${token}` } });
    const list = (await listResponse.json()) as { messages?: Array<{ id: string }>; error?: { message?: string } };
    if (!listResponse.ok) throw new Error(list.error?.message || "Unable to read Gmail inbox.");

    let imported = 0;
    for (const item of list.messages ?? []) {
      const detailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`, { headers: { Authorization: `Bearer ${token}` } });
      const detail = (await detailResponse.json()) as { id: string; threadId?: string; payload?: { headers?: Array<{ name?: string; value?: string }>; body?: { data?: string }; parts?: GmailPart[] } };
      const headers = detail.payload?.headers;
      const from = sender(header(headers, "From"));
      const subject = header(headers, "Subject") || "No subject";
      const body = findBody(detail.payload ?? {});
      const existing = await prisma.message.findUnique({ where: { providerMessageId: detail.id } });
      if (existing) continue;

      const message = await prisma.message.create({ data: { provider: "gmail", providerMessageId: detail.id, threadId: detail.threadId, senderName: from.name, senderEmail: from.email, subject, body, category: "Routine", confidence: 0, status: "Pending", deliveryStatus: "NotSent" } });
      const analysis = await analyzeMessageWithGemini({ sender: from.name, email: from.email, subject, body });
      await saveMessageAnalysis({ id: message.id, sender: from.name, email: from.email, subject, body, analysis });
      await saveActivityLog({ messageId: message.id, action: "Gmail message imported", details: `Imported Gmail message ${detail.id}.` });
      imported += 1;
    }

    return NextResponse.json({ success: true, imported });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unable to import Gmail." }, { status: 500 });
  }
}
