import { NextResponse } from "next/server";
import { analyzeMessageWithGemini } from "@/lib/gemini";
import { saveActivityLog, saveMessageAnalysis } from "@/lib/inbox-data";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || !body.message || typeof body.message !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Message payload is required.",
        },
        { status: 400 },
      );
    }

    const { sender, email, subject, body: messageBody } = body.message;

    if (!messageBody || typeof messageBody !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Message body is required.",
        },
        { status: 400 },
      );
    }

    const analysis = await analyzeMessageWithGemini({
      sender,
      email,
      subject,
      body: messageBody,
    });

    const savedMessage = await saveMessageAnalysis({
      sender,
      email,
      subject,
      body: messageBody,
      analysis,
    });

    await saveActivityLog({
      messageId: savedMessage.id,
      action: "AI analysis",
      details: `${analysis.category} classification saved with ${analysis.confidence.toFixed(2)} confidence.`,
    });

    return NextResponse.json({
      success: true,
      payload: {
        category: analysis.category,
        confidence: analysis.confidence,
        needsHumanReview: analysis.needsHumanReview,
        extracted: analysis.extracted,
        draftReply: analysis.draftReply,
        reasoning: analysis.reason,
        savedMessageId: savedMessage.id,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI processing error.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
