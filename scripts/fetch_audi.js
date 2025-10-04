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
const ICAL = require('ical.js');

const AUDI_ICS_URL = 'https://audifield.com/events/?ical=1';

function parseICS(icsText) {
  try {
    // The Audi Field iCal feed incorrectly labels times as TZID=UTC when they're actually
    // in America/New_York timezone. Fix this before parsing.
    const fixedIcsText = icsText.replace(/TZID=UTC:/g, 'TZID=America/New_York:');
    
    // Parse the iCal data using ical.js
    const jcalData = ICAL.parse(fixedIcsText);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');
    
    return vevents.map(vevent => {
      const event = new ICAL.Event(vevent);
      return {
        title: event.summary || 'Event',
        startISO: event.startDate ? event.startDate.toJSDate().toISOString() : null,
        endISO: event.endDate ? event.endDate.toJSDate().toISOString() : null
      };
    }).filter(e => e.startISO);
  } catch (error) {
    console.error('Error parsing iCal:', error);
    return [];
  }
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
  const events = parseICS(text);

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


