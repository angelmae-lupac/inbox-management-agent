import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { InboxMessage, MessageCategory, MessageStatus } from "@/lib/inbox-types";
import type { GeminiAnalysisResult } from "@/lib/gemini";

function mapCategory(category: string | null | undefined): MessageCategory {
  const normalized = String(category ?? "Routine").trim().toLowerCase();

  if (normalized.includes("urgent")) return "Urgent";
  if (normalized.includes("spam")) return "Spam";
  return "Routine";
}

function normalizeStatus(status: string | null | undefined): MessageStatus {
  return status === "Handled" ? "Handled" : "Pending";
}

function mapDbMessage(record: {
  id: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  body: string;
  category: string;
  status: string | null;
  requiresHumanReview: boolean;
  confidence: number;
  extractedDetails: Prisma.JsonValue | null;
  draftReply: string | null;
  aiReason: string | null;
  createdAt: Date;
}): InboxMessage {
  const extracted = (record.extractedDetails ?? {}) as Record<string, string | null | undefined>;

  return {
    id: record.id,
    sender: record.senderName,
    email: record.senderEmail,
    subject: record.subject,
    preview: record.body.slice(0, 120),
    body: record.body,
    category: mapCategory(record.category),
    confidence: Number(record.confidence ?? 0),
    status: normalizeStatus(record.status),
    requiresHumanReview: Boolean(record.requiresHumanReview),
    extracted: {
      orderNumber: extracted.orderNumber ?? undefined,
      requestedDate: extracted.requestedDate ?? undefined,
      customerName: extracted.customerName ?? undefined,
      issueType: extracted.issueType ?? undefined,
    },
    draftReply: record.draftReply ?? "",
    aiReason: record.aiReason ?? "",
    createdAt: record.createdAt.toISOString(),
  };
}

export async function getInboxMessages(): Promise<InboxMessage[]> {
  const records = await prisma.message.findMany({
    orderBy: { createdAt: "desc" },
  });

  return records.map(mapDbMessage);
}

export function getInboxSummary(messages: InboxMessage[]) {
  return {
    total: messages.length,
    urgent: messages.filter((message) => message.category === "Urgent").length,
    routine: messages.filter((message) => message.category === "Routine").length,
    spam: messages.filter((message) => message.category === "Spam").length,
    pending: messages.filter((message) => message.status === "Pending").length,
    humanReview: messages.filter((message) => message.requiresHumanReview).length,
  };
}

export async function saveActivityLog(input: {
  messageId?: string | null;
  action: string;
  details: string;
}) {
  await prisma.activityLog.create({
    data: {
      messageId: input.messageId ?? null,
      action: input.action,
      details: input.details,
    },
  });
}

export async function saveMessageAnalysis(input: {
  id?: string;
  sender?: string;
  email?: string;
  subject?: string;
  body: string;
  analysis: GeminiAnalysisResult;
}) {
  const extractedDetails = {
    orderNumber: input.analysis.extracted.orderNumber ?? null,
    requestedDate: input.analysis.extracted.requestedDate ?? null,
    customerName: input.analysis.extracted.customerName ?? null,
    issueType: input.analysis.extracted.issueType ?? null,
  };

  const fallbackSubject = input.subject ?? "No subject";
  const fallbackSender = input.sender ?? "Unknown";
  const fallbackEmail = input.email ?? "unknown@example.com";

  const match = input.id
    ? await prisma.message.findUnique({ where: { id: input.id } })
    : await prisma.message.findFirst({
        where: {
          senderName: fallbackSender,
          senderEmail: fallbackEmail,
          subject: fallbackSubject,
          body: input.body,
        },
      });

  if (match) {
    const updated = await prisma.message.update({
      where: { id: match.id },
      data: {
        senderName: fallbackSender,
        senderEmail: fallbackEmail,
        subject: fallbackSubject,
        body: input.body,
        category: input.analysis.category,
        status: input.analysis.needsHumanReview ? "Pending" : "Handled",
        requiresHumanReview: input.analysis.needsHumanReview,
        confidence: input.analysis.confidence,
        extractedDetails,
        draftReply: input.analysis.draftReply,
        aiReason: input.analysis.reason,
      },
    });

    return mapDbMessage(updated);
  }

  const created = await prisma.message.create({
    data: {
      senderName: fallbackSender,
      senderEmail: fallbackEmail,
      subject: fallbackSubject,
      body: input.body,
      category: input.analysis.category,
      status: input.analysis.needsHumanReview ? "Pending" : "Handled",
      requiresHumanReview: input.analysis.needsHumanReview,
      confidence: input.analysis.confidence,
      extractedDetails,
      draftReply: input.analysis.draftReply,
      aiReason: input.analysis.reason,
    },
  });

  return mapDbMessage(created);
}
