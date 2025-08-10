const NATS_TEAM_ID = 120; // Washington Nationals

function formatDateToYYYYMMDD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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

async function fetchTodaysGame() {
  const today = new Date();
  const dateParam = formatDateToYYYYMMDD(today);
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${NATS_TEAM_ID}&date=${dateParam}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch schedule');
  const data = await res.json();
  const dates = data?.dates ?? [];
  if (dates.length === 0) return null;
  const games = dates[0]?.games ?? [];
  if (games.length === 0) return null;
  return games[0];
}

function computeTrafficImpact(isHome) {
  return isHome ? {
    label: 'Higher local traffic expected (home game)',
    level: 'warn',
  } : {
    label: 'Slight traffic increase (away game)',
    level: 'ok',
  };
}

function renderNoGame(container) {
  container.innerHTML = `
    <div class="status"><span class="dot none"></span>No game today</div>
    <div class="detail">Enjoy smoother traffic than usual.</div>
  `;
}

function renderGame(container, game) {
  const homeTeam = game?.teams?.home?.team?.name;
  const awayTeam = game?.teams?.away?.team?.name;
  const isHome = game?.teams?.home?.team?.id === NATS_TEAM_ID;
  const opponent = isHome ? awayTeam : homeTeam;
  const venue = game?.venue?.name ?? '';
  const startTime = toEasternTimeString(game?.gameDate);
  const impact = computeTrafficImpact(isHome);

  container.innerHTML = `
    <div class="status">
      <span class="dot ${impact.level}"></span>
      ${isHome ? 'Home game' : 'Away game'} vs ${opponent}
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

function renderError(container, message) {
  container.innerHTML = `
    <div class="status"><span class="dot warn"></span>Could not load schedule</div>
    <div class="detail">${message}</div>
  `;
}

async function refresh() {
  const container = document.getElementById('app');
  container.innerHTML = '<div class="loading">Checking today\'s schedule…</div>';
  try {
    const game = await fetchTodaysGame();
    if (!game) {
      renderNoGame(container);
    } else {
      renderGame(container, game);
    }
  } catch (e) {
    renderError(container, e.message ?? 'Unknown error');
  }
}

document.getElementById('refreshBtn').addEventListener('click', refresh);
refresh();


