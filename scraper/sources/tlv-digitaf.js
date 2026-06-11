/**
 * Tel Aviv Municipality — Digitaf early childhood events (ages 0–3).
 *
 * The Digitaf page is SharePoint 2013 with an Angular controller.
 * After page render, all 319 baby-audience items are loaded into
 * the Angular scope at `eab.items`. We extract them via Playwright
 * and filter to CategoryId=40 (Digitaf program only).
 *
 * URL: https://www.tel-aviv.gov.il/Residents/Digitel/Pages/DigiTaf.aspx?CategoryId=40&AudID=7
 */

import { chromium as playwrightChromium } from 'playwright-core';
import chromium from '@sparticuz/chromium';

const DIGITAF_URL = 'https://www.tel-aviv.gov.il/Residents/Digitel/Pages/DigiTaf.aspx?CategoryId=40&AudID=7';
const SOURCE_NAME = 'Tel Aviv Municipality';
const TODAY = new Date().toISOString().split('T')[0];

// ─── Date parsing ────────────────────────────────────────────────────────────

// "10/06/2026 16:30-10/06/2026 16:30&noon;15/06/2026 11:15-..."
function parseSessionDates(timePos) {
  if (!timePos) return { next_dates: [], time_start: null };

  const sessions = timePos.split(';').filter(Boolean);
  const dates = [];
  let time_start = null;

  for (const session of sessions) {
    const match = session.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2})/);
    if (!match) continue;
    const [, day, month, year, time] = match;
    const dateStr = `${year}-${month}-${day}`;
    if (dateStr >= TODAY) {
      dates.push(dateStr);
      if (!time_start) time_start = time;
    }
  }

  return {
    next_dates: [...new Set(dates)].sort().slice(0, 4),
    time_start,
  };
}

// "27.05.26, 00:00" → "2026-05-27"
function parseStartDate(val) {
  if (!val) return null;
  const match = val.match(/^(\d{2})\.(\d{2})\.(\d{2})/);
  if (!match) return null;
  const [, day, month, yr] = match;
  return `20${yr}-${month}-${day}`;
}

// ─── URL + category ──────────────────────────────────────────────────────────

function buildSourceUrl(item) {
  const id = item.ListItemID?.Value;
  if (!id) return DIGITAF_URL;
  return `https://www.tel-aviv.gov.il/Pages/MainItemPage.aspx?WebID=${item.WebID?.Value}&ListID=${item.ListID?.Value}&ItemID=${id}`;
}

function mapCategory(interests = '') {
  if (interests.includes('מוזיקה') || interests.includes('מוסיקה')) return 'wellness';
  if (interests.includes('ספורט') || interests.includes('תנועה') || interests.includes('הליכה')) return 'movement';
  if (interests.includes('סיפור') || interests.includes('ספריה')) return 'wellness';
  if (interests.includes('יצירה')) return 'creative';
  return 'baby-focused';
}

// ─── Event mapping ───────────────────────────────────────────────────────────

function mapToMamaOut(item) {
  const val = f => item[f]?.Value || '';

  const { next_dates, time_start } = parseSessionDates(val('TlvSearchContentForLobbyTimePosition'));
  const fallbackDate = parseStartDate(val('TlvStartDate'));

  const usedDates = next_dates.length > 0 ? next_dates : (fallbackDate ? [fallbackDate] : []);
  if (usedDates.length === 0) return null;  // no future dates — skip

  const isFree     = !val('TlvPaymentRequired') && !val('TlvPaymentCost');
  const address    = val('TlvAddress1') || val('TlvCityLocation') || 'תל אביב';
  const institution = val('TlvInstitution');

  const scheduleLabel = time_start
    ? `${usedDates.length > 1 ? `${usedDates.length} sessions` : 'One session'} · ${time_start}`
    : usedDates.length > 1 ? `${usedDates.length} upcoming sessions` : null;

  return {
    name:             val('Title'),
    description:      val('TlvBenefitDescription'),
    location:         'Tel Aviv',
    address,
    neighborhood:     null,
    source_url:       buildSourceUrl(item),
    source_name:      SOURCE_NAME,
    category:         mapCategory(val('TlvFieldsOfInterests')),
    schedule_type:    usedDates.length > 1 ? 'recurring' : 'one-time',
    schedule_label:   scheduleLabel,
    next_dates:       usedDates,
    time_start,
    time_end:         null,
    price:            isFree ? 0 : null,
    price_notes:      val('TlvBenefitDescription') || (isFree ? 'Free (pre-registration required)' : null),
    stroller_accessible: null,
    baby_age_min:     0,
    baby_age_max:     156,   // 3 years in weeks
    is_verified:      true,
    language:         'he',
  };
}

// ─── Playwright fetch ────────────────────────────────────────────────────────

async function fetchDigitafItems() {
  // Local dev: use installed system Chromium; Vercel: use @sparticuz/chromium
  const isVercel = !!process.env.VERCEL;
  const executablePath = isVercel
    ? await chromium.executablePath()
    : undefined;

  const browser = await playwrightChromium.launch({
    args: isVercel ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.goto(DIGITAF_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for Angular to populate eab.items
    await page.waitForFunction(() => {
      const el = document.querySelector('[ng-controller="eabCtrl as eab"]');
      if (!el) return false;
      try {
        const items = angular.element(el).scope().eab.items;
        return Array.isArray(items) && items.length > 0;
      } catch { return false; }
    }, { timeout: 20000 });

    const items = await page.evaluate(() => {
      const el = document.querySelector('[ng-controller="eabCtrl as eab"]');
      return angular.element(el).scope().eab.items;
    });

    return items;
  } finally {
    await browser.close();
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function scrapeDigitaf() {
  console.log('[tlv-digitaf] launching browser...');

  let items;
  try {
    items = await fetchDigitafItems();
  } catch (err) {
    console.error(`[tlv-digitaf] browser error: ${err.message}`);
    return [];
  }

  console.log(`[tlv-digitaf] raw items from Angular scope: ${items.length}`);

  // Filter: Digitaf category only, not hidden
  const digitaf = items.filter(item =>
    item.TlvItemCategoryId?.Value === '40' &&
    item.TlvHideInSite?.Value !== 'True'
  );
  console.log(`[tlv-digitaf] after CategoryId=40 filter: ${digitaf.length}`);

  // Map and drop items with no future dates
  const seen = new Set();
  const results = [];
  for (const item of digitaf) {
    const mapped = mapToMamaOut(item);
    if (!mapped || !mapped.source_url) continue;
    if (seen.has(mapped.source_url)) continue;
    seen.add(mapped.source_url);
    results.push(mapped);
  }

  console.log(`[tlv-digitaf] ${results.length} unique upcoming events`);
  return results;
}
