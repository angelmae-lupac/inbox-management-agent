import { NextResponse } from "next/server";
import { getInboxMessages, saveActivityLog, saveMessageAnalysis } from "@/lib/inbox-data";
import { analyzeMessageWithGemini } from "@/lib/gemini";

export async function GET() {
  const messages = await getInboxMessages();

  return NextResponse.json({
    success: true,
    messages,
  });
}

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
      message: "Inbox message accepted and saved to the database.",
      data: savedMessage,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to handle request.",
      },
      { status: 500 },
    );
  }
}
