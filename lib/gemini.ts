import { GoogleGenerativeAI } from "@google/generative-ai";

export type GeminiAnalysisResult = {
  category: "Urgent" | "Routine" | "Spam";
  confidence: number;
  needsHumanReview: boolean;
  extracted: {
    orderNumber?: string;
    requestedDate?: string;
    customerName?: string;
    issueType?: string;
  };
  draftReply: string;
  reason: string;
};

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is missing. Gemini integration will fail until it is set in .env.local.");
}

const client = apiKey ? new GoogleGenerativeAI(apiKey) : null;

function normalizeCategory(value: string): "Urgent" | "Routine" | "Spam" {
  const normalized = String(value ?? "Routine").trim().toLowerCase();

  if (normalized.includes("urgent")) return "Urgent";
  if (normalized.includes("spam")) return "Spam";
  return "Routine";
}

function clampConfidence(value: number) {
  if (Number.isNaN(value)) return 0.85;
  return Math.min(0.99, Math.max(0.5, value));
}

function cleanJsonText(raw: string) {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function isRetryableGeminiError(error: unknown) {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? "");
  const normalized = text.toLowerCase();

  return /429|rate[-\s]?limit|too many requests|resource exhausted|quota exceeded|heavy traffic|service unavailable|temporar(?:y|ily) unavailable|503|overloaded|deadline exceeded|internal error/.test(normalized);
}

async function waitForRetry(attempt: number) {
  const delayMs = 800 * attempt;
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function withGeminiRetry<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isRetryableGeminiError(error) || attempt >= maxAttempts) {
        throw error;
      }

      await waitForRetry(attempt);
    }
  }

  throw lastError;
}

export async function analyzeMessageWithGemini(message: {
  sender?: string;
  email?: string;
  subject?: string;
  body: string;
}): Promise<GeminiAnalysisResult> {
  if (!client) {
    throw new Error("Gemini client is not configured. Please set GEMINI_API_KEY in .env.local.");
  }

  const model = client.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
    systemInstruction:
      "You are an inbox triage assistant for a small business. Respond with valid JSON only. Use the exact structure requested.",
  });

  const prompt = `
    Analyze this incoming email for a business inbox.

    Return valid JSON with exactly this structure:
    {
      "category": "Urgent | Routine | Spam",
      "confidence": 0.0-1.0,
      "needsHumanReview": true|false,
      "extracted": {
        "orderNumber": "string or null",
        "requestedDate": "string or null",
        "customerName": "string or null",
        "issueType": "string or null"
      },
      "draftReply": "string",
      "reason": "string"
    }

    Rules:
    - classify as Urgent only if there is clear time pressure, complaint severity, complaints about service failure, or serious business impact.
    - classify as Spam when the email is suspicious, generic, phishing-like, promotional, or obviously fraudulent.
    - otherwise use Routine.
    - If an order number is mentioned, extract it.
    - If a date or requested time is mentioned, extract it.
    - If the sender name appears, include it as customerName.
    - Keep the draftReply professional and concise.
    - Keep the reason brief but transparent.

    Email details:
    Sender: ${message.sender ?? "Unknown"}
    Email: ${message.email ?? "Unknown"}
    Subject: ${message.subject ?? "No subject"}
    Body: ${message.body}
  `;

  try {
    const result = await withGeminiRetry(() =>
      model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
    );

    const rawText = cleanJsonText(result.response.text());

    let parsed: {
      category?: unknown;
      confidence?: unknown;
      needsHumanReview?: unknown;
      extracted?: Record<string, unknown>;
      draftReply?: unknown;
      reason?: unknown;
    };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error("Gemini returned malformed JSON for the inbox analysis.");
    }

    const stringValue = (value: unknown) => (typeof value === "string" ? value : undefined);
    const extracted = parsed.extracted ?? {};
    const category = normalizeCategory(stringValue(parsed.category) ?? "Routine");
    const confidence = clampConfidence(Number(parsed.confidence ?? 0.85));
    const needsHumanReview = Boolean(parsed.needsHumanReview ?? category === "Urgent");

    return {
      category,
      confidence,
      needsHumanReview,
      extracted: {
        orderNumber: stringValue(extracted.orderNumber),
        requestedDate: stringValue(extracted.requestedDate),
        customerName: stringValue(extracted.customerName),
        issueType: stringValue(extracted.issueType),
      },
      draftReply: String(parsed.draftReply ?? "Thank you for reaching out. We will review this and respond shortly."),
      reason: String(parsed.reason ?? "Classified through AI analysis of the email content."),
    };
  } catch (error) {
    const friendlyMessage = "The AI service is temporarily busy. Please try again in a moment.";

    if (isRetryableGeminiError(error)) {
      console.error("Gemini rate-limited after retries.", error);
      throw new Error(friendlyMessage);
    }

    console.error("Gemini analysis failed.", error);
    throw new Error(friendlyMessage);
  }
}
