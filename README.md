# Is There a Game Today Near Navy Yard?

A minimal static site that shows whether the Washington Nationals play today and whether there are events at Audi Field, with start times in Eastern Time and a quick traffic impact note.

## Features
- Nationals: Home/Away status with opponent and venue; first pitch in ET
- Audi Field: Shows today’s events and the next upcoming event
- Traffic impact colors: Home/events = red, Away = yellow (caution), No events = green
- No build step, just static files loaded from the same origin

## Files
- `index.html` – page markup (two cards: Nationals and Audi Field)
- `styles.css` – simple styling
- `app.js` – reads prebuilt JSON from `data/` and renders the view
- `data/nats.json` – prebuilt JSON with the next Nationals game
- `data/audi.json` – prebuilt JSON with today’s Audi Field events and the next event
- `scripts/` – Node scripts to fetch and build JSON (`fetch_all.sh`, `fetch_nats.js`, `fetch_audi.js`)
- `sw.js` – service worker configured to disable caching (no offline)

## Data Sources (used by build scripts)
- MLB Stats API (`https://statsapi.mlb.com`) – Washington Nationals team ID: `120`
- Audi Field Events iCal (`https://audifield.com/events/?ical=1`) from the [Audi Field events page](https://audifield.com/events/)

## Quick Start
Option A — simple local server with Python 3:

```bash
# From the project root
python3 -m http.server 5173 --directory .
# Then open http://localhost:5173/
```

Option B — any static server works (e.g., `npx serve`, `http-server`, Netlify CLI). Just serve the directory and open it in a browser.

## Prebuilding data (static JSON)
Prefetch data and serve as static JSON so the client never calls third-party APIs.

One command:

```bash
chmod +x scripts/fetch_all.sh
scripts/fetch_all.sh
```

This creates/updates:
- `data/nats.json` with shape:
  ```json
  {
    "lastUpdated": "2025-08-11T00:00:00.000Z",
    "nextEvent": {
      "isToday": true,
      "isHome": false,
      "opponent": "San Francisco Giants",
      "venue": "Oracle Park",
      "dateISO": "2025-08-10T20:05:00Z"
    }
  }
  ```
- `data/audi.json` with shape:
  ```json
  {
    "lastUpdated": "2025-08-11T00:00:00.000Z",
    "eventsToday": [
      { "title": "Event Name", "startISO": "2025-08-11T23:00:00Z", "endISO": "2025-08-12T01:00:00Z" }
    ],
    "nextEvent": { "title": "Next Event", "startISO": "2025-08-14T00:00:00Z", "endISO": "2025-08-14T03:00:00Z", "isToday": false }
  }
  ```

The frontend reads only these JSON files from the same origin.

## Configuration
- Team selection: `app.js` uses `NATS_TEAM_ID = 120`. To switch teams, change that ID to the desired MLB team ID.
- Time zone: First pitch is displayed in `America/New_York` (ET).

## How it works
- The frontend loads `data/nats.json` and `data/audi.json` from the current origin.
- Nationals: If `nextEvent.isToday` is true, show it prominently with color (home = red, away = yellow). Otherwise show “No game today” with a subdued “Next game” row.
- Audi Field: Shows today’s events prominently in red. If none, shows green “No event today” and a subdued “Next event” row.
- All times displayed in ET.

## Deployment
- GitHub Pages, Netlify, or any static host: just serve the directory.
- The service worker disables caching to ensure fresh data on every load. If you change files, do a hard refresh or update the service worker in DevTools.

## Installable PWA
- The site includes a web app manifest and a service worker. Caching is disabled (no offline) to keep data fresh.
- On iOS Safari: Share → Add to Home Screen.
- On Android Chrome: you should see an “Install app” prompt or use the browser menu → Add to Home Screen.

## SEO and indexing
This site is a static, crawlable page. To help search engines, you can:

- Keep a descriptive `<title>` and meta description (already added in `index.html`).
- Add a canonical tag (replace the domain):

  ```html
  <link rel="canonical" href="https://your-domain.example/" />
  ```

- Provide a simple `robots.txt` and `sitemap.xml` at the site root:

  robots.txt
  ```
  User-agent: *
  Allow: /
  Sitemap: https://your-domain.example/sitemap.xml
  ```

  sitemap.xml
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>https://your-domain.example/</loc>
      <changefreq>hourly</changefreq>
      <priority>1.0</priority>
    </url>
  </urlset>
  ```

- Add structured data (JSON‑LD) based on the prebuilt JSON files so crawlers see key info without running JavaScript. A simple pattern is to generate a file during the fetch step and inline it into `index.html`.

  Example (generated from `data/nats.json` and `data/audi.json`):
  ```html
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Is There a Game Today Near Navy Yard?",
    "url": "https://your-domain.example/"
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    "name": "Washington Nationals vs {{opponent}}",
    "sport": "Baseball",
    "startDate": "{{dateISO}}",
    "eventStatus": "https://schema.org/EventScheduled",
    "location": {"@type": "StadiumOrArena", "name": "{{venue}}"},
    "homeTeam": "Washington Nationals",
    "awayTeam": "{{opponent}}"
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": "{{audiNextTitle}}",
    "startDate": "{{audiNextStartISO}}",
    "location": {"@type": "StadiumOrArena", "name": "Audi Field"}
  }
  </script>
  ```

  To automate: extend `scripts/fetch_*.js` to write `includes/schema.html` and include it in `index.html` during your deploy step.

## Notes
- The site does not use analytics or cookies.
- There’s a `Refresh` button if you want to re-check the API without reloading the page.
- If your browser requests `/favicon.ico`, you may see a 404 in the server logs; this is harmless.

## Troubleshooting
- If nothing loads, check your network and the browser console for errors.
- If times look off, verify your system time and note that the page normalizes game time to Eastern Time.
