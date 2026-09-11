import fs from 'node:fs';

const envText = fs.readFileSync('.env.local', 'utf8');
const match = envText.match(/GEMINI_API_KEY="([^"]+)"/);
const key = match?.[1];

console.log('KEY_PRESENT:', Boolean(key));
console.log('KEY_PREFIX:', key ? key.slice(0, 12) : 'missing');

if (!key) {
  process.exit(1);
}

const payload = {
  contents: [
    {
      parts: [{ text: 'Reply with JSON: {"category":"Routine","confidence":0.9,"needsHumanReview":false,"extracted":{"customerName":"Test Customer"},"draftReply":"Hello","reason":"Test"}' }],
    },
  ],
};

const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

const text = await res.text();
console.log('HTTP_STATUS:', res.status);
console.log('RESPONSE:', text.slice(0, 800));
