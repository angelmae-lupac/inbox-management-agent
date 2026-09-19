import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReplyWithResend } from "@/lib/email-provider";
import { getGmailConnection, sendGmailReply } from "@/lib/gmail";
import { saveActivityLog } from "@/lib/inbox-data";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.DEMO_MODE === "true") {
    return NextResponse.json({ success: false, error: "Sending is disabled in portfolio demo mode." }, { status: 403 });
  }

  const { id } = await params;
  const payload = (await request.json().catch(() => null)) as { body?: unknown } | null;

  if (payload?.body !== undefined && typeof payload.body !== "string") {
    return NextResponse.json({ success: false, error: "Reply body must be text." }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { success: false, error: "A database is required before sending real email." },
      { status: 503 },
    );
  }

  const message = await prisma.message.findUnique({ where: { id } });

  if (!message) {
    return NextResponse.json({ success: false, error: "Message not found." }, { status: 404 });
  }

  if (message.requiresHumanReview) {
    return NextResponse.json(
      { success: false, error: "This message requires human review before it can be sent." },
      { status: 409 },
    );
  }

  if (message.deliveryStatus === "Sent" || message.deliveryStatus === "Delivered") {
    return NextResponse.json({ success: false, error: "A reply has already been sent for this message." }, { status: 409 });
  }

  const replyBody = (payload?.body as string | undefined)?.trim() || message.draftReply?.trim();

  if (!replyBody) {
    return NextResponse.json({ success: false, error: "A reply body is required." }, { status: 400 });
  }

  const reply = await prisma.reply.create({
    data: {
      messageId: message.id,
      body: replyBody,
      status: "Queued",
    },
  });

  await prisma.message.update({
    where: { id: message.id },
    data: { deliveryStatus: "Queued" },
  });

  try {
    const subject = message.subject.toLowerCase().startsWith("re:") ? message.subject : `Re: ${message.subject}`;
    const gmailConnection = await getGmailConnection();
    const result = gmailConnection
      ? await sendGmailReply({ to: message.senderEmail, subject, text: replyBody, inReplyTo: message.providerMessageId ?? undefined })
      : await sendReplyWithResend({ to: message.senderEmail, subject, text: replyBody, replyTo: process.env.EMAIL_REPLY_TO, references: message.providerMessageId ?? message.threadId ?? undefined });

    await prisma.$transaction([
      prisma.reply.update({
        where: { id: reply.id },
        data: {
          providerMessageId: result.providerMessageId,
          status: "Sent",
          sentAt: new Date(),
        },
      }),
      prisma.message.update({
        where: { id: message.id },
        data: {
          status: "Handled",
          deliveryStatus: "Sent",
          sentAt: new Date(),
        },
      }),
    ]);

    await saveActivityLog({
      messageId: message.id,
      action: "Reply sent",
      details: `Reply accepted by Resend as ${result.providerMessageId}.`,
    });

    return NextResponse.json({
      success: true,
      deliveryStatus: "Sent",
      providerMessageId: result.providerMessageId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unable to send reply.";

    await prisma.$transaction([
      prisma.reply.update({ where: { id: reply.id }, data: { status: "Failed", error: errorMessage } }),
      prisma.message.update({ where: { id: message.id }, data: { deliveryStatus: "Failed" } }),
    ]);

    await saveActivityLog({
      messageId: message.id,
      action: "Reply failed",
      details: errorMessage,
    });

    return NextResponse.json({ success: false, error: errorMessage }, { status: 502 });
  }
}
