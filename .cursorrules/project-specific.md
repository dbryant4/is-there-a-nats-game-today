# Project-Specific Rules: Navy Yard Games App

## Architecture Overview
This is a static site that shows Washington Nationals games and Audi Field events with traffic impact indicators.

## Data Flow
1. Build scripts (`scripts/fetch_*.js`) fetch data from APIs
2. Data is saved as static JSON files in `data/`
3. Frontend (`app.js`) reads only from local JSON files
4. No external API calls from the browser

## File Structure Rules
- `index.html` - Single page application entry point
- `app.js` - Frontend logic, reads from `data/*.json`
- `styles.css` - All styling, uses CSS custom properties
- `data/` - Prebuilt JSON files (nats.json, audi.json)
- `scripts/` - Node.js build scripts for fetching data
- `icons/` - SVG icons and PWA assets

## Time Zone Handling
- All data sources use Eastern Time (America/New_York)
- Store times as UTC in JSON files
- Display times as Eastern Time in the UI
- Handle daylight saving time transitions automatically

## Traffic Impact Logic
- Home games/events = red (high impact)
- Away games = yellow (moderate impact)
- No events = green (low impact)
- Use consistent color coding across both cards

## PWA Requirements
- Service worker disables caching for fresh data
- Manifest supports home screen installation
- Install banner encourages PWA adoption
- Icons use "DC" branding for the area

## Build Process
- Run `npm run fetch` or `./scripts/fetch_all.sh` to update data
- No compilation step needed - serve static files directly
- Deploy to any static host (GitHub Pages, Netlify, etc.)

## API Integration
- MLB Stats API for Nationals games (team ID 120)
- Audi Field iCal feed for venue events
- Use `ical.js` library for proper iCal parsing
- Handle API failures gracefully with fallback messaging
