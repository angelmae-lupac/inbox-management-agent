import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyResendSignature(rawBody: string, request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const webhookId = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signatures = request.headers.get("svix-signature");

  if (!secret || !webhookId || !timestamp || !signatures) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) return false;

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${webhookId}.${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes).update(signedContent).digest("base64");

  return signatures.split(" ").some((signature) => {
    const [, value] = signature.split(",", 2);
    if (!value) return false;
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(value);
    return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
  });
}
