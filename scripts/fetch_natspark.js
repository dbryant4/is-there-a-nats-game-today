#!/usr/bin/env node
/*
  Fetch Nationals Park non-MLB events from the public events page and write data/natspark.json
  Source: https://www.mlb.com/nationals/tickets/events

  Output shape:
  {
    lastUpdated: ISO,
    eventsToday: Array<{ title: string, startISO: string | null, url?: string }>,
    nextEvent: null | { title: string, startISO: string | null, url?: string, isToday: boolean }
  }

  Notes:
  - The page is a marketing/events listing and may change markup. We use a few robust regexes
    to extract event blocks (date + title). This is best-effort and may require adjustments.
  - Times are often absent on the listing; when no time is present we store null for startISO.
  - All comparisons for "today" are done in America/New_York.
*/

const fs = require('fs');
const path = require('path');

const EVENTS_URL = 'https://www.mlb.com/nationals/tickets/events';

function getEasternDateYYYYMMDD(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const parts = fmt.formatToParts(date);
  const y = parts.find(p=>p.type==='year').value;
  const m = parts.find(p=>p.type==='month').value;
  const d = parts.find(p=>p.type==='day').value;
  return `${y}-${m}-${d}`;
}

function parseMonthNameToNumber(monthName) {
  const map = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
  };
  const k = String(monthName || '').trim().toLowerCase();
  return map[k] || null;
}

function tryBuildISO(year, month, day, timeStr) {
  try {
    // If a time like "7:00 PM" appears, parse; otherwise default to 12:00 local.
    let hours = 12, minutes = 0;
    if (timeStr) {
      const m = String(timeStr).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (m) {
        hours = parseInt(m[1], 10);
        minutes = parseInt(m[2], 10);
        const ampm = m[3].toUpperCase();
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
      }
    }
    // Build a date in ET and convert to ISO
    const dt = new Date(Date.UTC(year, month - 1, day, hours, minutes));
    // Adjust to ET offset for the target date by using Intl
    const et = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(dt);
    const y = parseInt(et.find(p=>p.type==='year').value, 10);
    const m = parseInt(et.find(p=>p.type==='month').value, 10);
    const d = parseInt(et.find(p=>p.type==='day').value, 10);
    const hh = parseInt(et.find(p=>p.type==='hour').value, 10);
    const mm = parseInt(et.find(p=>p.type==='minute').value, 10);
    const local = new Date(Date.UTC(y, m - 1, d, hh, mm));
    return local.toISOString();
  } catch {
    return null;
  }
}

function toAbsoluteUrl(href) {
  if (!href) return undefined;
  try {
    if (href.startsWith('http://') || href.startsWith('https://')) return href;
    if (href.startsWith('//')) return `https:${href}`;
    if (href.startsWith('/')) return `https://www.mlb.com${href}`;
    return `https://www.mlb.com/${href.replace(/^\.?\/?/, '')}`;
  } catch { return undefined; }
}

function stripTags(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractMoreInfoUrlAround(html, centerIndex) {
  const start = Math.max(0, centerIndex - 8000);
  const end = Math.min(html.length, centerIndex + 8000);
  const windowHtml = html.slice(start, end);
  const anchorRe = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  let bestHref;
  let bestDist = Infinity;
  while ((m = anchorRe.exec(windowHtml)) !== null) {
    const href = m[1];
    const inner = stripTags(m[2]);
    if (/more\s*information/i.test(inner)) {
      const anchorStart = start + (m.index || 0);
      const dist = Math.abs(anchorStart - centerIndex);
      if (dist < bestDist) {
        bestDist = dist;
        bestHref = href;
      }
    }
  }
  return bestHref ? toAbsoluteUrl(bestHref) : undefined;
}

function parseEventsFromHtml(html) {
  const events = [];
  // We look for month headers like "October" near a date/day and a title line.
  // Simple heuristic: find blocks like "Saturday, October 25, 2025" then capture the following title text.
  const dateLineRe = /(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s*,\s*([A-Za-z]+)\s+(\d{1,2})\s*,\s*(\d{4})/g;
  let match;
  while ((match = dateLineRe.exec(html)) !== null) {
    const monthName = match[2];
    const day = parseInt(match[3], 10);
    const year = parseInt(match[4], 10);
    const month = parseMonthNameToNumber(monthName);
    if (!month) continue;

    // Extract title: prefer the closest headline BEFORE the date, not after,
    // and explicitly ignore CTA links like "More Information".
    const backWindowStart = Math.max(0, match.index - 1200);
    const lookbehind = html.slice(backWindowStart, match.index);
    // Find all candidate text nodes in headings/strong/spans; pick the last meaningful one.
    const tagTextRe = />([^<]{3,160}?)<\/(?:strong|h[1-6]|span|p|div|a)>/gi;
    let m2;
    let candidateTitle = null;
    while ((m2 = tagTextRe.exec(lookbehind)) !== null) {
      const t = m2[1].replace(/\s+/g, ' ').trim();
      if (!t) continue;
      const lower = t.toLowerCase();
      // Skip common non-titles
      if (/(more\s*information|learn\s*more|buy\s*tickets|details)/i.test(t)) continue;
      if (/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i.test(t)) continue; // weekday lines
      if (/^(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(t)) continue; // month lines
      candidateTitle = t; // keep last good one
    }

    // If not found behind, look ahead as fallback (still skip CTAs)
    let title = candidateTitle;
    if (!title) {
      const lookahead = html.slice(match.index, match.index + 800);
      const fwdMatches = [...lookahead.matchAll(tagTextRe)].map(x => x[1].replace(/\s+/g, ' ').trim());
      const firstGood = fwdMatches.find(t => t && !/(more\s*information|learn\s*more|buy\s*tickets|details)/i.test(t));
      if (firstGood) title = firstGood;
    }
    if (!title) title = 'Event';

    // Optional time like "7:00 PM" near the date (search both ahead and behind)
    const lookaround = html.slice(Math.max(0, match.index - 200), match.index + 1200);
    const timeMatch = lookaround.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    const timeStr = timeMatch ? timeMatch[1] : null;

    // Associated "More Information" link near this event (handles nested markup inside anchor)
    const url = extractMoreInfoUrlAround(html, match.index);

    const startISO = tryBuildISO(year, month, day, timeStr);
    events.push({ title: title || 'Event', startISO, url });
  }
  return dedupeByDayAndTitle(events);
}

function dedupeByDayAndTitle(events) {
  const seen = new Set();
  const out = [];
  for (const e of events) {
    const key = `${(e.startISO || 'null').slice(0,10)}|${e.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

async function main() {
  const res = await fetch(EVENTS_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Nationals Park events fetch failed: ${res.status}`);
  const html = await res.text();
  const events = parseEventsFromHtml(html);

  // Determine events today and the next upcoming event (including today)
  const todayStr = getEasternDateYYYYMMDD();
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year:'numeric', month:'2-digit', day:'2-digit' });

  const eventsWithDate = events.map(e => ({
    ...e,
    dayKey: e.startISO ? getEasternDateYYYYMMDD(new Date(e.startISO)) : null
  }));

  const eventsToday = eventsWithDate.filter(e => e.dayKey === todayStr).map(({dayKey, ...rest}) => rest);

  const now = new Date();
  const sorted = events.slice().sort((a,b) => {
    const da = a.startISO ? new Date(a.startISO) : new Date(8640000000000000);
    const db = b.startISO ? new Date(b.startISO) : new Date(8640000000000000);
    return da - db;
  });
  const next = sorted.find(e => !e.startISO || new Date(e.startISO) >= now) || null;
  const nextEvent = next ? {
    ...next,
    isToday: next.startISO ? (getEasternDateYYYYMMDD(new Date(next.startISO)) === todayStr) : false,
  } : null;

  const out = { lastUpdated: new Date().toISOString(), eventsToday, nextEvent };
  const outDir = path.join(process.cwd(), 'data');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'natspark.json'), JSON.stringify(out, null, 2));
  console.log('Wrote data/natspark.json');
}

main().catch((e) => { console.error(e); process.exit(1); });


