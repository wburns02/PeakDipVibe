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
- Production: `https://profound-intuition-production-cce9.up.railway.app`
- API (Tailscale): `https://r730.tailad2d5f.ts.net/api`
- Local API: `http://localhost:8001/api`
- Deploy frontend: `railway up -d` from PeakDipVibe directory (auto-deploy from GitHub NOT working)

## API Notes
- Production API is on Tailscale — unreachable from Railway's network, so production shows empty data
- Local dev shows full data when backend is running on port 8001
- CORS allowed origins include localhost:5173, 5174, 5175 and *.up.railway.app
