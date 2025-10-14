const NATS_TEAM_ID = 120; // Washington Nationals

function formatDateToYYYYMMDD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// No external fetches; data is prebuilt in ./data/*.json

function toEasternTimeString(isoString) {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date) + ' ET';
  } catch (e) {
    return '';
  }
}

function toEasternDateString(isoString) {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch (e) {
    return '';
  }
}

function daysUntilInET(isoString) {
  try {
    const eventDate = new Date(isoString);
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const partsToday = fmt.formatToParts(new Date());
    const partsEvent = fmt.formatToParts(eventDate);
    const yT = Number(partsToday.find(p=>p.type==='year').value);
    const mT = Number(partsToday.find(p=>p.type==='month').value);
    const dT = Number(partsToday.find(p=>p.type==='day').value);
    const yE = Number(partsEvent.find(p=>p.type==='year').value);
    const mE = Number(partsEvent.find(p=>p.type==='month').value);
    const dE = Number(partsEvent.find(p=>p.type==='day').value);
    const startTodayUTC = Date.UTC(yT, mT - 1, dT);
    const startEventUTC = Date.UTC(yE, mE - 1, dE);
    const diffDays = Math.round((startEventUTC - startTodayUTC) / 86400000);
    return diffDays;
  } catch {
    return null;
  }
}

function formatInDays(n) {
  if (n === null || Number.isNaN(n)) return '';
  if (n <= 0) return 'today';
  if (n === 1) return 'in 1 day';
  return `in ${n} days`;
}

function setCardImpact(container, level) {
  const card = container.closest('.card');
  if (!card) return;
  const impactClasses = ['impact-ok', 'impact-warn', 'impact-none', 'impact-danger'];
  for (const c of impactClasses) card.classList.remove(c);
  const classMap = { ok: 'impact-ok', warn: 'impact-warn', none: 'impact-none', danger: 'impact-danger' };
  card.classList.add(classMap[level] || 'impact-none');
}

// Live MLB fetch removed; using static JSON

async function fetchNatsFromStatic() {
  try {
    const res = await fetch('./data/nats.json', { cache: 'no-store' });
    if (!res.ok) return null;
    const d = await res.json();
    return { nextEvent: d?.nextEvent || null, lastUpdated: d?.lastUpdated || null };
  } catch { return null; }
}

// Audi Field live fetch removed; using static JSON

async function fetchAudiFromStatic() {
  try {
    const res = await fetch('./data/audi.json', { cache: 'no-store' });
    if (!res.ok) return { eventsToday: [], nextEvent: null, lastUpdated: null };
    const d = await res.json();
    return { eventsToday: d?.eventsToday || [], nextEvent: d?.nextEvent || null, lastUpdated: d?.lastUpdated || null };
  } catch { return { eventsToday: [], nextEvent: null, lastUpdated: null }; }
}

// Nationals Park (non-MLB) events from static JSON

async function fetchNatsParkFromStatic() {
  try {
    const res = await fetch('./data/natspark.json', { cache: 'no-store' });
    if (!res.ok) return { eventsToday: [], nextEvent: null, lastUpdated: null };
    const d = await res.json();
    return { eventsToday: d?.eventsToday || [], nextEvent: d?.nextEvent || null, lastUpdated: d?.lastUpdated || null };
  } catch { return { eventsToday: [], nextEvent: null, lastUpdated: null }; }
}

function computeTrafficImpact(isHome) {
  return isHome ? {
    label: 'Higher local traffic expected (home game)',
    level: 'danger',
  } : {
    label: 'Slight traffic increase (away game)',
    level: 'warn',
  };
}

function renderNoGame(container) {
  setCardImpact(container, 'ok');
  container.innerHTML = `
    <div class="status"><span class="dot ok"></span>No game today</div>
    <div class="detail">Enjoy smoother traffic than usual.</div>
  `;
}

function renderNatsEvent(container, ev) {
  const isHome = Boolean(ev?.isHome);
  const opponent = ev?.opponent || 'Opponent';
  const venue = ev?.venue || (isHome ? 'Nationals Park' : '');
  const startTime = toEasternTimeString(ev?.dateISO);
  const impact = computeTrafficImpact(isHome);
  setCardImpact(container, impact.level);

  container.innerHTML = `
    <div class="status">
      <span class="dot ${impact.level}"></span>
      <span class="badge ${isHome ? 'badge-home' : 'badge-away'}">${isHome ? 'Home' : 'Away'}</span>
      ${isHome ? 'vs' : 'at'} ${opponent}
    </div>
    <div class="meta">
      <div>
        <label>First pitch</label>
        <div>${startTime}</div>
      </div>
      <div>
        <label>Venue</label>
        <div>${venue || (isHome ? 'Nationals Park' : '—')}</div>
      </div>
    </div>
    <div class="detail">${impact.label}</div>
  `;
}

// Removed D.C. United section; covered by Audi Field events

function renderError(container, message) {
  setCardImpact(container, 'none');
  container.innerHTML = `
    <div class="status"><span class="dot warn"></span>Could not load schedule</div>
    <div class="detail">${message}</div>
  `;
}

async function refresh() {
  const natsEl = document.getElementById('nats-app');
  const natsparkEl = document.getElementById('natspark-app');
  const audiEl = document.getElementById('audi-app');
  natsEl.innerHTML = '<div class="loading">Checking today\'s Nationals schedule…</div>';
  if (natsparkEl) natsparkEl.innerHTML = '<div class="loading">Checking today\'s Nationals Park events…</div>';
  audiEl.innerHTML = '<div class="loading">Checking today\'s Audi Field events…</div>';
  setCardImpact(natsEl, 'none');
  if (natsparkEl) setCardImpact(natsparkEl, 'none');
  setCardImpact(audiEl, 'none');

  const [natsData, natsparkData, audiData] = await Promise.all([
    fetchNatsFromStatic(),
    fetchNatsParkFromStatic(),
    fetchAudiFromStatic(),
  ]);

  if (natsData && natsData.nextEvent) {
    const natsGame = natsData.nextEvent;
    if (natsGame.isToday) {
      renderNatsEvent(natsEl, natsGame);
      if (natsData.lastUpdated) {
        natsEl.insertAdjacentHTML('beforeend', `<div class="last-checked">Last checked: ${toEasternDateString(natsData.lastUpdated)} · ${toEasternTimeString(natsData.lastUpdated)}</div>`);
      }
    } else {
      // Not today: show subdued next event info
      setCardImpact(natsEl, 'ok');
      const inDays = formatInDays(daysUntilInET(natsGame.dateISO));
      natsEl.innerHTML = `
        <div class="status"><span class="dot ok"></span>No game today</div>
        <div class="meta">
          <div><label>Next game</label><div>${natsGame.isHome ? 'Home' : 'Away'} ${natsGame.isHome ? 'vs' : 'at'} ${natsGame.opponent}</div></div>
          <div><label>Date</label><div>${toEasternDateString(natsGame.dateISO)} · ${toEasternTimeString(natsGame.dateISO)}</div></div>
        </div>
        <div class="detail">Traffic impact lower today; ${inDays ? `next game ${inDays}.` : 'plan ahead for the next game.'}</div>
        ${natsData.lastUpdated ? `<div class="last-checked">Last checked: ${toEasternDateString(natsData.lastUpdated)} · ${toEasternTimeString(natsData.lastUpdated)}</div>` : ''}
      `;
    }
  } else {
    renderNoGame(natsEl);
    if (natsData && natsData.lastUpdated) {
      natsEl.insertAdjacentHTML('beforeend', `<div class="last-checked">Last checked: ${toEasternDateString(natsData.lastUpdated)} · ${toEasternTimeString(natsData.lastUpdated)}</div>`);
    }
  }

  // Nationals Park non-MLB events
  {
    const el = natsparkEl;
    const { eventsToday, nextEvent, lastUpdated } = natsparkData || { eventsToday: [], nextEvent: null, lastUpdated: null };
    if (!el) {
      // no container; skip
    } else if (eventsToday && eventsToday.length > 0) {
      const first = eventsToday[0];
      const dateText = first.startISO ? toEasternDateString(first.startISO) : '—';
      setCardImpact(el, 'danger');
      let nextBlock = '';
      if (nextEvent && !nextEvent.isToday && (!first.startISO || nextEvent.startISO !== first.startISO)) {
        const inDaysRaw = nextEvent.startISO ? daysUntilInET(nextEvent.startISO) : null;
        const inDaysText = formatInDays(inDaysRaw);
        nextBlock = `
          <details class="next">
            <summary>Next event ${inDaysText ? inDaysText : ''}</summary>
            <div class="meta">
              <div><label>Event</label><div>${nextEvent.title}</div></div>
              ${nextEvent.startISO ? `<div><label>Date</label><div>${toEasternDateString(nextEvent.startISO)}</div></div>` : ''}
              ${nextEvent.url ? `<div><label>Info</label><div><a href="${nextEvent.url}" target="_blank" rel="noopener noreferrer">More Information</a></div></div>` : ''}
            </div>
          </details>
        `;
      }
      el.innerHTML = `
        <div class="status"><span class="dot danger"></span>Event at Nationals Park</div>
        <div class="meta">
          <div><label>Event</label><div>${first.title}</div></div>
          <div><label>Date</label><div>${dateText}</div></div>
          ${first.url ? `<div><label>Info</label><div><a class="link-cta" href="${first.url}" target="_blank" rel="noopener noreferrer">More Information</a></div></div>` : ''}
        </div>
        ${nextBlock}
        <div class="detail">Traffic likely higher near the ballpark</div>
        ${lastUpdated ? `<div class="last-checked">Last checked: ${toEasternDateString(lastUpdated)} · ${toEasternTimeString(lastUpdated)}</div>` : ''}
      `;
    } else if (nextEvent) {
      setCardImpact(el, 'ok');
      const inDaysRaw = nextEvent.startISO ? daysUntilInET(nextEvent.startISO) : null;
      const inDaysText = formatInDays(inDaysRaw);
      el.innerHTML = `
        <div class="status"><span class="dot ok"></span>No event today</div>
        ${lastUpdated ? `<div class="last-checked">Last checked: ${toEasternDateString(lastUpdated)} · ${toEasternTimeString(lastUpdated)}</div>` : ''}
        <div class="detail">Area traffic likely normal.</div>
        <details class="next">
          <summary>Next event ${inDaysText ? inDaysText : ''}</summary>
          <div class="meta">
            <div><label>Event</label><div>${nextEvent.title}</div></div>
            ${nextEvent.startISO ? `<div><label>Date</label><div>${toEasternDateString(nextEvent.startISO)}</div></div>` : ''}
            ${nextEvent.url ? `<div><label>Info</label><div><a class="link-cta" href="${nextEvent.url}" target="_blank" rel="noopener noreferrer">More Information</a></div></div>` : ''}
          </div>
        </details>
      `;
    } else {
      setCardImpact(el, 'ok');
      el.innerHTML = `
        <div class="status"><span class="dot ok"></span>No event today</div>
        <div class="detail">Area traffic likely normal.</div>
        ${lastUpdated ? `<div class="last-checked">Last checked: ${toEasternDateString(lastUpdated)} · ${toEasternTimeString(lastUpdated)}</div>` : ''}
      `;
    }
  }

  {
    const { eventsToday, nextEvent, lastUpdated } = audiData || { eventsToday: [], nextEvent: null, lastUpdated: null };
    if (eventsToday && eventsToday.length > 0) {
      const first = eventsToday[0];
      const time = toEasternTimeString(first.startISO);
      setCardImpact(audiEl, 'danger');
      let nextBlock = '';
      if (nextEvent && !nextEvent.isToday && nextEvent.startISO !== first.startISO) {
        const inDaysRaw = daysUntilInET(nextEvent.startISO);
        const inDaysText = formatInDays(inDaysRaw);
        nextBlock = `
          <details class="next">
            <summary>Next event ${inDaysText ? inDaysText : ''}</summary>
            <div class="meta">
              <div><label>Event</label><div>${nextEvent.title}</div></div>
              <div><label>Date</label><div>${toEasternDateString(nextEvent.startISO)} · ${toEasternTimeString(nextEvent.startISO)}</div></div>
            </div>
          </details>
        `;
      }
      audiEl.innerHTML = `
        <div class="status"><span class="dot danger"></span>Event at Audi Field</div>
        <div class="meta">
          <div><label>Event</label><div>${first.title}</div></div>
          <div><label>Start</label><div>${time}</div></div>
        </div>
        ${nextBlock}
        <div class="detail">${eventsToday.length > 1 ? `${eventsToday.length} events today` : 'Traffic likely higher near the stadium'}</div>
        ${lastUpdated ? `<div class="last-checked">Last checked: ${toEasternDateString(lastUpdated)} · ${toEasternTimeString(lastUpdated)}</div>` : ''}
      `;
    } else if (nextEvent) {
      setCardImpact(audiEl, 'ok');
      const inDaysRaw = daysUntilInET(nextEvent.startISO);
      const inDaysText = formatInDays(inDaysRaw);
      audiEl.innerHTML = `
        <div class="status"><span class="dot ok"></span>No event today</div>
        ${lastUpdated ? `<div class="last-checked">Last checked: ${toEasternDateString(lastUpdated)} · ${toEasternTimeString(lastUpdated)}</div>` : ''}
        <div class="detail">Traffic impact lower today; plan ahead for the next event.</div>
        <details class="next">
          <summary>Next event ${inDaysText ? inDaysText : ''}</summary>
          <div class="meta">
            <div><label>Event</label><div>${nextEvent.title}</div></div>
            <div><label>Date</label><div>${toEasternDateString(nextEvent.startISO)} · ${toEasternTimeString(nextEvent.startISO)}</div></div>
          </div>
        </details>
      `;
    } else {
      setCardImpact(audiEl, 'ok');
      audiEl.innerHTML = `
        <div class="status"><span class="dot ok"></span>No event today</div>
        <div class="detail">Area traffic likely normal.</div>
        ${lastUpdated ? `<div class="last-checked">Last checked: ${toEasternDateString(lastUpdated)} · ${toEasternTimeString(lastUpdated)}</div>` : ''}
      `;
    }
  }
}

document.getElementById('refreshBtn').addEventListener('click', refresh);
refresh();



// PWA install encouragement
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const banner = document.getElementById('installBanner');
  if (banner) banner.classList.add('show');
});

function hideInstallBanner() {
  const banner = document.getElementById('installBanner');
  if (banner) banner.classList.remove('show');
}

document.getElementById('installDismiss').addEventListener('click', hideInstallBanner);
document.getElementById('installAccept').addEventListener('click', async () => {
  if (!deferredPrompt) return hideInstallBanner();
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  hideInstallBanner();
});
