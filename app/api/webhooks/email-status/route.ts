import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveActivityLog } from "@/lib/inbox-data";
import { verifyResendSignature } from "@/lib/resend-webhook";

export const runtime = "nodejs";

const statusMap: Record<string, { reply: string; delivery: string }> = {
  "email.delivered": { reply: "Delivered", delivery: "Delivered" },
  "email.bounced": { reply: "Bounced", delivery: "Failed" },
  "email.failed": { reply: "Failed", delivery: "Failed" },
};

export async function POST(request: Request) {
  if (process.env.DEMO_MODE === "true") {
    return NextResponse.json(
      { success: false, error: "Delivery status updates are disabled in portfolio demo mode." },
      { status: 403 },
    );
  }

  const rawBody = await request.text();

  if (!verifyResendSignature(rawBody, request)) {
    return NextResponse.json({ success: false, error: "Invalid webhook signature." }, { status: 401 });
  }

  try {
    const event = JSON.parse(rawBody) as { type?: string; data?: { email_id?: string; id?: string } };
    const nextState = event.type ? statusMap[event.type] : undefined;
    const providerMessageId = event.data?.email_id ?? event.data?.id;

    if (!nextState || !providerMessageId) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const reply = await prisma.reply.findFirst({
      where: { providerMessageId },
      select: { id: true, messageId: true },
    });

    if (!reply) return NextResponse.json({ success: true, ignored: true });

    await prisma.$transaction([
      prisma.reply.update({ where: { id: reply.id }, data: { status: nextState.reply } }),
      prisma.message.update({ where: { id: reply.messageId }, data: { deliveryStatus: nextState.delivery } }),
    ]);

    await saveActivityLog({
      messageId: reply.messageId,
      action: `Reply ${nextState.reply.toLowerCase()}`,
      details: `Resend reported provider message ${providerMessageId} as ${nextState.reply.toLowerCase()}.`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email delivery webhook failed.", error);
    return NextResponse.json({ success: false, error: "Unable to process delivery event." }, { status: 500 });
  }
}