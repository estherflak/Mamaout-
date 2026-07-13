import Anthropic from '@anthropic-ai/sdk';

// Lazily constructed so that merely importing this module has no side effects.
// The Anthropic SDK throws at construction when no key is resolvable; deferring
// it means a caller without ANTHROPIC_API_KEY (e.g. a Vercel cron that only
// inserts) can import db.js → translate.js without crashing, and only pays the
// cost if it actually calls translateActivity().
let _client;
function getClient() {
  return _client ?? (_client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));
}

export const TRANSLATE_MODEL = 'claude-haiku-4-5-20251001';
export const TRANSLATE_MAX_TOKENS = 500;

export const TRANSLATE_SYSTEM = `You translate short activity listings for MamaOut, an app that helps mothers on
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

/** Build the user message for one translation. Shared by the sync and batch paths. */
export function buildTranslateUserMsg({ name, description }) {
  return `Translate these fields to English. Return JSON matching exactly:
{"name_en":"English name, ≤60 chars","description_en":"English description, ≤300 chars"}

name: ${sanitize(name)}
description: ${sanitize(description)}`;
}

/**
 * Parse a model response into { name_en, description_en }. Falls back to the
 * original text if the response can't be parsed, so a row always ends up with
 * *something*. Shared by the sync and batch paths.
 */
export function parseTranslation(text, { name, description }) {
  const parsed = parseJson((text || '').trim());
  return {
    name_en: parsed?.name_en?.trim() || name || null,
    description_en: parsed?.description_en?.trim() || description || null,
  };
}

// ── Places: English notes → Hebrew (notes_he) ────────────────────────────────
// Reverse direction from activities: places.notes is curated in English and the
// Hebrew UI shows notes_he.

export const TRANSLATE_NOTES_HE_SYSTEM = `You translate short venue descriptions for MamaOut, an app that helps mothers on
maternity leave find baby-friendly places in the Tel Aviv area. Translate the English text into natural,
concise Hebrew a young Israeli mother would find clear and warm. Keep venue, brand, and proper names
recognizable, and keep prices (₪), times, ages, and URLs exactly as written. Do not invent details.
Respond ONLY with a valid JSON object — no markdown.`;

export function buildNotesHeUserMsg({ notes }) {
  return `Translate to Hebrew. Return JSON matching exactly:
{"notes_he":"Hebrew translation, ≤300 chars"}

notes: ${sanitize(notes)}`;
}

// No source-text fallback here (unlike parseTranslation): writing English into
// notes_he would look "done" and never get retried. null = try again next run.
export function parseNotesHe(text) {
  const parsed = parseJson((text || '').trim());
  return parsed?.notes_he?.trim() || null;
}

/**
 * Translate one activity's name/description to English with a single live call.
 * Kept for ad-hoc/synchronous use; the daily backfill batches instead (50% cheaper).
 */
export async function translateActivity({ name, description }) {
  const res = await getClient().messages.create({
    model: TRANSLATE_MODEL,
    max_tokens: TRANSLATE_MAX_TOKENS,
    system: TRANSLATE_SYSTEM,
    messages: [{ role: 'user', content: buildTranslateUserMsg({ name, description }) }],
  });
  return parseTranslation(res.content[0].text, { name, description });
}
