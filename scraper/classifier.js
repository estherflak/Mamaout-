import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You classify and translate event listings for an app that helps mothers on maternity leave
find activities with their babies (0–12 months) in Tel Aviv and Ramat Gan, Israel.

Relevance is STRICT. Mark is_relevant: true ONLY for activities explicitly designed for mothers with babies, such as:
yoga/pilates with babies, baby swimming, baby massage, sensory play, mom social groups,
baby music/rhythm, postpartum wellness, parent+baby creative workshops, developmental play.

Mark is_relevant: false for: standup comedy, theater, professional training, adult-only events,
kids' classes for toddlers/older children, general fitness not designed for postpartum/baby-present,
restaurant/food events, and anything not specifically targeting mothers with infants.

Always provide English translations even if the original is in Hebrew.
Respond ONLY with a valid JSON object — no markdown, no extra text.`;

const SCHEMA = `{
  "name": "string (cleaned name in original language, ≤60 chars)",
  "name_en": "string (English translation of name, ≤60 chars)",
  "description": "string (clean description in original language, ≤300 chars)",
  "description_en": "string (English translation of description, ≤300 chars)",
  "category": "one of: movement | wellness | creative | social | baby-focused",
  "price_range": "one of: free | ₪ | ₪₪ | ₪₪₪",
  "baby_age_min": "integer weeks (0 = from birth, null = unknown)",
  "language": "he or en",
  "venue": "string (specific venue name if mentioned, null otherwise)",
  "event_date": "ISO 8601 date-time string if a specific date is stated, null otherwise",
  "cta_label": "one of: Book now | Reserve a spot | View schedule | More info — pick the most accurate label based on what the source URL likely leads to (booking page vs. info page)",
  "is_relevant": "boolean — true ONLY if suitable for a woman on maternity leave with a baby aged 0-12 months"
}`;

// Replace characters that break JSON when Claude echoes them into string values.
// Hebrew gershayim ״ (U+05F4) and ASCII double-quote " both cause issues.
function sanitizeForPrompt(s) {
  return (s || '')
    .replace(/״/g, "'") // Hebrew gershayim ״ → single quote
    .replace(/"/g, "'");     // ASCII double-quote → single quote
}

function repairJson(text) {
  // Strip markdown fences
  let s = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  // Try straight parse first
  try { return JSON.parse(s); } catch { /* continue to repair */ }
  // Replace unescaped double-quotes inside string values with single quotes.
  // This regex replaces any " that is not a JSON structural character.
  s = s.replace(/"([^"]*)":/g, (_, k) => `"${k}":`)  // preserve keys
       .replace(/:\s*"([\s\S]*?)"/g, (_, v) =>        // fix values
         ': "' + v.replace(/"/g, "'") + '"');
  return JSON.parse(s);
}

export async function classifyActivity(raw) {
  const extraContext = raw.raw_date ? `\nDate/time info: ${raw.raw_date}` : '';

  const userMsg = `Classify this listing and return JSON matching exactly this schema:
${SCHEMA}

Listing:
Name: ${sanitizeForPrompt(raw.name)}
Description: ${sanitizeForPrompt(raw.description)}
Location: ${sanitizeForPrompt(raw.location)}
Venue: ${sanitizeForPrompt(raw.venue)}${extraContext}
URL: ${raw.source_url || ''}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    system: SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
  });

  const text = response.content[0].text.trim();
  return repairJson(text);
}
