import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You classify web listings for an app that helps mothers on maternity leave find
activities with their babies in Tel Aviv and Ramat Gan, Israel.
Respond ONLY with a valid JSON object — no markdown, no extra text.`;

const SCHEMA = `{
  "name": "string (cleaned activity name, ≤60 chars)",
  "description": "string (clean description in the same language as the original, ≤300 chars)",
  "category": "one of: movement | wellness | creative | social | baby-focused",
  "price_range": "one of: free | ₪ | ₪₪ | ₪₪₪",
  "baby_age_min": "integer weeks (0 = from birth, null = unknown)",
  "language": "he or en",
  "is_relevant": "boolean — false if clearly not a mom+baby activity"
}`;

export async function classifyActivity(raw) {
  const userMsg = `Classify this listing and return JSON matching exactly this schema:
${SCHEMA}

Listing:
Name: ${raw.name || ''}
Description: ${raw.description || ''}
Location: ${raw.location || ''}
URL: ${raw.source_url || ''}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
  });

  const text = response.content[0].text.trim();
  // Strip any accidental markdown fences
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(clean);
}
