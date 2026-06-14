import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You translate short activity listings for MamaOut, an app that helps mothers on
maternity leave find baby-friendly activities (babies 0–12 months) in Tel Aviv and Ramat Gan, Israel.
Translate the Hebrew text into natural, concise English a young mother would find clear and warm.
Keep venue, brand, and proper names recognizable (transliterate rather than over-translate).
Do not invent details that aren't in the source. Respond ONLY with a valid JSON object — no markdown.`;

// Hebrew gershayim and stray double-quotes break JSON when echoed back.
function sanitize(s) {
  return (s || '').replace(/״/g, "'").replace(/"/g, "'");
}

function parseJson(text) {
  let s = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try { return JSON.parse(s); } catch { /* continue */ }
  const m = s.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* continue */ } }
  return null;
}

/**
 * Translate one activity's name/description to English.
 * Returns { name_en, description_en }. Falls back to the original text if the
 * model response can't be parsed, so a row always ends up with *something*.
 */
export async function translateActivity({ name, description }) {
  const userMsg = `Translate these fields to English. Return JSON matching exactly:
{"name_en":"English name, ≤60 chars","description_en":"English description, ≤300 chars"}

name: ${sanitize(name)}
description: ${sanitize(description)}`;

  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: SYSTEM,
    messages: [{ role: 'user', content: userMsg }],
  });

  const parsed = parseJson(res.content[0].text.trim());
  return {
    name_en: parsed?.name_en?.trim() || name || null,
    description_en: parsed?.description_en?.trim() || description || null,
  };
}
