import { NextResponse } from "next/server";
import { analyzeMessageWithGemini } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import { saveActivityLog, saveMessageAnalysis } from "@/lib/inbox-data";
import { verifyResendSignature } from "@/lib/resend-webhook";

export const runtime = "nodejs";

function parseSender(value: unknown) {
  const text = String(value ?? "Unknown").trim();
  const match = text.match(/^(.*?)\s*<([^>]+)>$/);
  return {
    name: match?.[1]?.replace(/^"|"$/g, "").trim() || text,
    email: match?.[2]?.trim() || text,
  };
}

export async function POST(request: Request) {
  if (process.env.DEMO_MODE === "true") {
    return NextResponse.json(
      { success: false, error: "Inbound email is disabled in portfolio demo mode." },
      { status: 403 },
    );
  }

  const rawBody = await request.text();

  if (!verifyResendSignature(rawBody, request)) {
    return NextResponse.json({ success: false, error: "Invalid webhook signature." }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: false, error: "Database is not configured." }, { status: 503 });
  }

  try {
    const event = JSON.parse(rawBody) as {
      type?: string;
      data?: {
        email_id?: string;
        id?: string;
        thread_id?: string;
        from?: string;
        subject?: string;
        text?: string;
        html?: string;
      };
    };

    if (event.type !== "email.received") {
      return NextResponse.json({ success: true, ignored: true });
    }

    const data = event.data ?? {};
    const providerMessageId = data.email_id ?? data.id;
    const messageBody = data.text ?? data.html?.replace(/<[^>]+>/g, " ").trim();

    if (!providerMessageId || !messageBody) {
      return NextResponse.json({ success: false, error: "Inbound event is missing an ID or body." }, { status: 400 });
    }

    const existing = await prisma.message.findUnique({ where: { providerMessageId } });
    if (existing) return NextResponse.json({ success: true, duplicate: true, messageId: existing.id });

    const sender = parseSender(data.from);
    const message = await prisma.message.create({
      data: {
        provider: "resend",
        providerMessageId,
        threadId: data.thread_id,
        senderName: sender.name,
        senderEmail: sender.email,
        subject: data.subject ?? "No subject",
        body: messageBody,
        category: "Routine",
        confidence: 0,
        status: "Pending",
        deliveryStatus: "NotSent",
      },
    });

    const analysis = await analyzeMessageWithGemini({
      sender: sender.name,
      email: sender.email,
      subject: data.subject,
      body: messageBody,
    });

    await saveMessageAnalysis({
      id: message.id,
      sender: sender.name,
      email: sender.email,
      subject: data.subject,
      body: messageBody,
      analysis,
    });

    await saveActivityLog({
      messageId: message.id,
      action: "Inbound email received",
      details: `Received and analyzed message ${providerMessageId}.`,
    });

    return NextResponse.json({ success: true, messageId: message.id }, { status: 201 });
  } catch (error) {
    console.error("Inbound email webhook failed.", error);
    return NextResponse.json({ success: false, error: "Unable to process inbound email." }, { status: 500 });
  }
}