# Is There a Nats Game Today?

A minimal static site that shows whether the Washington Nationals play today, whether it's a home or away game, first pitch time (Eastern Time), and a quick traffic impact note.

## Features
- Home/Away status with opponent and venue
- First pitch time shown in ET
- Traffic impact hint: Home games = higher, Away games = slight
- No build step, just static files

## Files
- `index.html` – page markup
- `styles.css` – simple styling
- `app.js` – fetches MLB schedule and renders the view

## Data Source
- MLB Stats API (`https://statsapi.mlb.com`)
- Washington Nationals team ID: `120`

## Quick Start
Option A — simple local server with Python 3:

```bash
# From the project root
python3 -m http.server 5173 --directory .
# Then open http://localhost:5173/
```

Option B — any static server works (e.g., `npx serve`, `http-server`, Netlify CLI). Just serve the directory and open it in a browser.

## Configuration
- Team selection: `app.js` uses `NATS_TEAM_ID = 120`. To switch teams, change that ID to the desired MLB team ID.
- Time zone: First pitch is displayed in `America/New_York` (ET).

## How it works
- On load, `app.js` calls the MLB Stats API schedule endpoint for today and `teamId=120`.
- If there’s a game today, it renders home/away, opponent, venue, and ET first pitch time, with a traffic note.
- If there’s no game, it shows “No game today”.

## Deployment
- GitHub Pages, Netlify, or any static host:
  - Upload these three files as-is.
  - Ensure they’re served over HTTPS (the Stats API is HTTPS).

## Notes
- The site does not use analytics or cookies.
- There’s a `Refresh` button if you want to re-check the API without reloading the page.
- If your browser requests `/favicon.ico`, you may see a 404 in the server logs; this is harmless.

## Troubleshooting
- If nothing loads, check your network and the browser console for errors.
- If times look off, verify your system time and note that the page normalizes game time to Eastern Time.
