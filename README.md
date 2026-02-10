# PolicyFront.io

**The front line for policy intelligence**

Track bills. Monitor media. Stay ahead of the narrative.

---

## Project Structure

```
policyfront/
├── app/          # Next.js landing page (deployed to Vercel)
├── backend/      # Fastify API + monitoring service
├── db/           # Database schema
└── docs/         # Architecture and design docs
```

---

## Stack

- **Frontend:** Next.js 15, Tailwind CSS, NDStudio design system
- **Backend:** Node.js, Fastify, Supabase (Postgres)
- **Monitoring:** Firecrawl API (paywalled sources), RSS feeds
- **Alerts:** Telegram bot
- **Hosting:** Vercel (frontend), Railway/Fly.io (backend)

---

## Getting Started

### Frontend (Landing Page)

```bash
cd app
npm install
npm run dev
```

Live: https://app-alpha-one-42.vercel.app

### Backend (API)

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with Supabase credentials
npm start
```

### Database Setup

```bash
# Run schema.sql in Supabase SQL Editor
psql $SUPABASE_URL < db/schema.sql
```

---

## Development Phases

**Phase 1 - MVP (Weeks 1-2)** ✅
- [x] Landing page with NDStudio design
- [x] Database schema
- [x] Backend API (topics, mentions)
- [x] Basic monitoring script
- [ ] Telegram alerts
- [ ] Supabase connection

**Phase 2 - Intelligence (Weeks 3-4)**
- [ ] Sentiment analysis (Perplexity API)
- [ ] Entity extraction
- [ ] Journalist database
- [ ] Coverage attribution

**Phase 3 - Dashboard (Weeks 5-6)**
- [ ] Next.js dashboard UI
- [ ] Timeline view
- [ ] Analytics charts
- [ ] Export to PDF/Word

**Phase 4 - Enterprise (Weeks 7-8)**
- [ ] LegiScan API integration
- [ ] Cross-state pattern analysis
- [ ] API access for enterprise
- [ ] White-label reports

---

## Pricing

| Tier | Price | Topics | States | Features |
|------|-------|--------|--------|----------|
| Solo | $49/mo | 5 | 2 | Basic monitoring, Telegram alerts |
| Professional | $149/mo | 25 | All 50 | + Sentiment, Export reports |
| Agency | $499/mo | Unlimited | All 50 | + Multi-user, API, White-label |

---

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Landing Page Design](./docs/LANDING-DESIGN.md)

---

## License

Proprietary - © 2026 PolicyFront
