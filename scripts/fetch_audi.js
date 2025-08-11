#!/usr/bin/env node
/*
  Fetch Audi Field events iCal and write data/audi.json
  Output shape:
  {
    lastUpdated: ISO,
    eventsToday: Array<{ title, startISO, endISO }>,
    nextEvent: null | { title, startISO, endISO, isToday: boolean }
  }
*/

const fs = require('fs');
const path = require('path');

const AUDI_ICS_URL = 'https://audifield.com/events/?ical=1';

function parseICS(icsText) {
  const events = [];
  let current = null;
  const lines = icsText.split(/\r?\n/);
  for (let raw of lines) {
    const line = raw.trim();
    if (line === 'BEGIN:VEVENT') { current = {}; continue; }
    if (line === 'END:VEVENT') { if (current) events.push(current); current = null; continue; }
    if (!current) continue;
    if (line.startsWith('DTSTART')) { current.start = line.split(':')[1]; }
    if (line.startsWith('DTEND')) { current.end = line.split(':')[1]; }
    if (line.startsWith('SUMMARY:')) { current.summary = line.slice('SUMMARY:'.length); }
  }
  return events;
}

function icsDateToISO(dt) {
  if (!dt) return null;
  const hasZ = dt.endsWith('Z');
  const y = dt.slice(0,4), m = dt.slice(4,6), d = dt.slice(6,8);
  const hh = dt.slice(9,11) || '00', mm = dt.slice(11,13) || '00';
  const ss = dt.slice(13,15) || '00';
  const iso = `${y}-${m}-${d}T${hh}:${mm}:${ss}${hasZ ? 'Z' : ''}`;
  try { return new Date(iso).toISOString(); } catch { return null; }
}

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

async function main() {
  const res = await fetch(AUDI_ICS_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Audi iCal fetch failed: ${res.status}`);
  const text = await res.text();
  const events = parseICS(text).map(e => ({
    title: e.summary || 'Event',
    startISO: icsDateToISO(e.start),
    endISO: icsDateToISO(e.end)
  })).filter(e => !!e.startISO);

  const todayStr = getEasternDateYYYYMMDD();
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year:'numeric', month:'2-digit', day:'2-digit' });
  const eventsToday = events.filter(e => {
    const parts = fmt.formatToParts(new Date(e.startISO));
    const y = parts.find(p=>p.type==='year').value;
    const m = parts.find(p=>p.type==='month').value;
    const d = parts.find(p=>p.type==='day').value;
    return `${y}-${m}-${d}` === todayStr;
  });

  // Determine next upcoming event (including today)
  events.sort((a,b) => new Date(a.startISO) - new Date(b.startISO));
  const now = new Date();
  const next = events.find(e => new Date(e.startISO) >= now) || null;
  const nextEvent = next ? {
    ...next,
    isToday: getEasternDateYYYYMMDD(new Date(next.startISO)) === todayStr,
  } : null;

  const out = { lastUpdated: new Date().toISOString(), eventsToday, nextEvent };
  const outDir = path.join(process.cwd(), 'data');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'audi.json'), JSON.stringify(out, null, 2));
  console.log('Wrote data/audi.json');
}

main().catch((e) => { console.error(e); process.exit(1); });


