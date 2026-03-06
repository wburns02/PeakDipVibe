# PeakDipVibe — Project Rules

## Development Workflow (HARD RULE)
1. **ALWAYS push to GitHub** after every commit — no exceptions
2. **ALWAYS test with Playwright** after making changes to verify features work in the browser
3. If Playwright shows something is broken:
   - Build a plan to fix it
   - Execute the fix
   - Test again with Playwright
   - If still broken, repeat — up to 30 iterations max
4. Only declare success when Playwright confirms the feature works visually
5. Never claim something works without Playwright verification

## Project Structure
- Frontend: `/home/will/PeakDipVibe/` (React 19 + TypeScript + Vite 7 + Tailwind 4 + Recharts + TanStack Query + Zod)
- Backend: `/home/will/stock-data-pipeline/` (FastAPI + SQLite)
- Database: `/mnt/win11/Fedora/stock-data-pipeline/data/market.db`
- Production: `https://stocks.ecbtx.com` (Railway: `profound-intuition-production-cce9.up.railway.app`)
- Backend API (Tailscale, R730): `http://100.82.237.57:8001/api`
- Local API: `http://localhost:8001/api`
- Deploy frontend: `railway up -d` from PeakDipVibe directory (auto-deploy from GitHub NOT working)

## API Architecture (2026-03-06)
- **Production**: Earnings data served as pre-computed JSON from `data/earnings/` via `server.mjs`
- **VITE_API_URL**: Set to `/api` in Railway env vars (same-origin, no CORS issues)
- **server.mjs**: Handles `/api/*` routes by mapping to JSON files in `data/` directory
- **Data refresh**: Re-fetch from R730 API (`http://100.82.237.57:8001/api/earnings/*`) and update `data/earnings/` JSON files
- **Local dev**: Still uses `http://localhost:8001/api` via `.env` (unchanged)
- Browser PNA (Private Network Access) blocks cross-origin Tailscale requests — same-origin approach is required

## API Notes
- R730 Tailscale Funnel (`r730.tailad2d5f.ts.net`) serves Conductor AI, NOT the stock API
- R730 stock API runs on port 8001 — accessible via Tailscale IP `100.82.237.57` only
- CORS allowed origins include localhost:5173, 5174, 5175 and *.up.railway.app
