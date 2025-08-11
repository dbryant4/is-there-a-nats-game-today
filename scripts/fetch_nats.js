#!/usr/bin/env node
/*
  Fetch the next scheduled Washington Nationals game (including today) from MLB Stats API and write data/nats.json
  Output shape:
  {
    lastUpdated: ISO,
    nextEvent: null | {
      isToday: boolean,
      isHome: boolean,
      opponent: string,
      venue: string,
      dateISO: string
    }
  }
*/

const fs = require('fs');
const path = require('path');

const NATS_TEAM_ID = 120;

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

async function fetchNats() {
  const start = getEasternDateYYYYMMDD();
  // search forward 60 days
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 60);
  const end = getEasternDateYYYYMMDD(endDate);
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${NATS_TEAM_ID}&startDate=${start}&endDate=${end}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`MLB fetch failed: ${res.status}`);
  const data = await res.json();
  const allDates = data?.dates || [];
  const allGames = [];
  for (const d of allDates) {
    for (const g of (d.games || [])) allGames.push(g);
  }
  if (allGames.length === 0) return { nextEvent: null };
  allGames.sort((a,b) => new Date(a.gameDate) - new Date(b.gameDate));
  const g = allGames[0];
  const isHome = g?.teams?.home?.team?.id === NATS_TEAM_ID;
  const opponent = isHome ? g?.teams?.away?.team?.name : g?.teams?.home?.team?.name;
  const venue = g?.venue?.name || (isHome ? 'Nationals Park' : '');
  const dateISO = g?.gameDate || null;
  const todayStr = getEasternDateYYYYMMDD(new Date());
  const eventDayStr = getEasternDateYYYYMMDD(new Date(dateISO));
  return {
    nextEvent: {
      isToday: eventDayStr === todayStr,
      isHome: Boolean(isHome),
      opponent: opponent || 'Opponent',
      venue,
      dateISO,
    }
  };
}

async function main() {
  const result = await fetchNats();
  const out = {
    lastUpdated: new Date().toISOString(),
    ...result,
  };
  const outDir = path.join(process.cwd(), 'data');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'nats.json'), JSON.stringify(out, null, 2));
  console.log('Wrote data/nats.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


