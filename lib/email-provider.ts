type SendReplyInput = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  references?: string;
};

type SendReplyResult = {
  providerMessageId: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export async function sendReplyWithResend(input: SendReplyInput): Promise<SendReplyResult> {
  const apiKey = getRequiredEnv("RESEND_API_KEY");
  const from = getRequiredEnv("EMAIL_FROM");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      reply_to: input.replyTo,
      headers: input.references
        ? {
            References: input.references,
            "In-Reply-To": input.references,
          }
        : undefined,
    }),
  });

  const payload = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;

  if (!response.ok || !payload?.id) {
    throw new Error(payload?.message || `Email provider returned ${response.status}.`);
  }

  return { providerMessageId: payload.id };
}

export function isEmailProviderConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}
