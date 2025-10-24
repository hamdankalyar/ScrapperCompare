# ScraperCompare — Scraper Comparison Toolkit

ScraperCompare is a small, flexible web-scraping testbed built with Node.js. This repository collects several scraping approaches (Cheerio, Readability, Puppeteer) behind a simple Express API and includes a tiny frontend for quick testing and side-by-side comparison.

Use it to evaluate extraction quality, execution time, and content differences between scraping strategies.

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [API Endpoints](#api-endpoints)
- [Examples (curl)](#examples-curl)
- [Project Structure](#project-structure)
- [Puppeteer notes / Troubleshooting](#puppeteer-notes--troubleshooting)
- [Contributing](#contributing)
- [License & Author](#license--author)

---

## Features

- Three scraping strategies:
  - Cheerio (fast HTML parsing)
  - Readability (content extraction using Mozilla Readability + JSDOM)
  - Puppeteer (full headless browser for JS-heavy pages)
- Endpoint to run a single method or run all methods in parallel for comparison.
- Minimal frontend in `public/` to test URLs interactively.
- Designed for experimentation and comparison of scraping approaches.

---

## Quick Start

Requirements
- Node.js (v16+ recommended)
- npm (bundled with Node)

Install and run:

```bash
# from repo root
npm install
npm run dev
```

By default the server listens on port 3000. Open the URL printed in the console (for example: http://localhost:3000) and try the frontend or call the API directly.

---

## API Endpoints

All scraping endpoints are POST and expect a JSON body with a `url` field.

- POST /api/scrape/:method
  - method: `cheerio` | `readability` | `puppeteer`
  - body: `{ "url": "https://example.com/article" }`
  - returns: a JSON object with `success`, `method`, `executionTime`, and `data` or `error`.

- POST /api/scrape-all
  - body: `{ "url": "https://example.com/article" }`
  - runs Cheerio, Readability and Puppeteer in parallel and returns an aggregate result for comparison.

- GET /api/health
  - returns a small JSON health object: `{ status: 'ok', message: 'Scraper API is running' }`

---

## Examples (curl)

Single method (cheerio):

```bash
curl -X POST http://localhost:3000/api/scrape/cheerio \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/article"}'
```

All methods (parallel):

```bash
curl -X POST http://localhost:3000/api/scrape-all \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/article"}'
```

Health check:

```bash
curl http://localhost:3000/api/health
```

---

## Project Structure

```
/ (project root)
├─ package.json            # Node project metadata and scripts
├─ server.js               # Express server + scraping implementations
├─ scraper-cheerio.js      # (optional) modular cheerio scraper (present in root)
├─ scraper-readability.js  # (optional) modular readability implementation
├─ scraper-puppeteer.js    # (optional) modular puppeteer implementation
├─ scraper-api.js          # (optional) helper API wrapper (present in root)
├─ scraper-compare.js      # (optional) comparer utilities
├─ public/                 # Tiny frontend
│  ├─ index.html
│  └─ app.js
└─ README.md
```

Notes: the repo ships consolidated scrapers in `server.js` so you can run quickly; the other `scraper-*.js` files are helper/alternate locations if you want to refactor into separate modules.

---

## Puppeteer notes / Troubleshooting

- Puppeteer downloads a Chromium binary by default. If you prefer to use an existing Chrome/Chromium, set the `PUPPETEER_EXECUTABLE_PATH` environment variable or adjust the `puppeteer.launch()` call.
- Common way to run without sandbox (e.g., in containers) is already included in `server.js` via args `--no-sandbox --disable-setuid-sandbox`.
- If Puppeteer fails to launch locally, try removing `node_modules/puppeteer` and reinstalling, or ensure your environment can run headless Chromium.
- The `.gitignore` includes `.local-chromium/` (where puppeteer may cache downloads) so large binaries won't be committed.

---

## Contributing

Contributions, bug reports and improvements are welcome.

Suggested workflow:
1. Fork the repo
2. Create a branch: `feature/your-feature`
3. Make changes and run the server locally to verify
4. Submit a PR with a clear description

Please include minimal, focused changes per PR.

---

## License & Author

This project uses the license declared in `package.json` (ISC).

Author: (you can add your name in `package.json` under `author`)

---

If you'd like, I can also:
- add a small `README` badge block and CI suggestions,
- split scrapers into separate modules and add unit tests,
- or add a `Makefile` / npm scripts to run quick smoke tests.

Tell me which you prefer and I'll follow up.
