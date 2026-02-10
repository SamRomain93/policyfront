# PolicyFront.io - Technical Architecture

**Domain:** policyfront.io  
**Tagline:** The front line for policy intelligence  
**Target Market:** PA/GR professionals, lobbying firms, consultants, elected officials

---

## Core Value Proposition

Monitor bills + media coverage in one place. Know what's happening in the legislature AND what story is being told about it in the press. Early warning system for policy professionals.

---

## Feature Set

### Phase 1 - MVP (Weeks 1-2)
- **Topic Tracking:** Track bills by state/number OR policy topics
- **Media Monitoring:** Firecrawl (paywalled) + RSS (open sources)
- **Telegram Alerts:** Real-time notifications for new mentions
- **Basic Analytics:** Mention count, sentiment, outlet breakdown

### Phase 2 - Intelligence Layer (Weeks 3-4)
- **Sentiment Analysis:** AI-powered framing detection
- **Entity Extraction:** Bills, amounts, orgs, people mentioned
- **Journalist Database:** Build contact DB from coverage
- **Coverage Attribution:** Link mentions back to bill movements

### Phase 3 - Dashboard (Weeks 5-6)
- **Web UI:** Timeline view, outlet breakdown, sentiment trends
- **Export Reports:** PDF/Word for stakeholder briefings
- **Multi-user:** Team accounts, shared topics

### Phase 4 - Enterprise (Weeks 7-8+)
- **LegiScan Integration:** Bill status triggers media searches
- **Cross-state Analysis:** Pattern recognition across states
- **API Access:** Programmatic access for enterprise
- **White-label:** Custom branding for agencies

---

## Tech Stack

### Backend
- **Language:** Node.js (TypeScript)
- **Framework:** Fastify or Express
- **Database:** PostgreSQL (Supabase hosted or self-hosted)
- **Queue:** BullMQ + Redis (for async jobs)
- **Cron:** Node-cron for scheduled searches

### Data Sources
- **Paywalled:** Firecrawl API (Politico Pro, Bloomberg Gov, E&E News)
- **Open:** RSS feeds (Google News, state capitol press)
- **Social:** X/Twitter via search-x skill
- **Bills:** LegiScan API (phase 2+)

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS
- **Fonts:** Instrument Serif (headlines), Inter (body)
- **Design:** NDStudio-inspired (warm cream, bold typography, one idea per viewport)
- **Hosting:** Vercel

### Alerts & Notifications
- **Telegram:** Primary alert channel (existing OpenClaw integration)
- **Email:** SendGrid for digests
- **Webhooks:** For enterprise API customers

---

## Database Schema

```sql
-- Topics being monitored
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL, -- "California AB-1290"
  type TEXT NOT NULL, -- 'bill' | 'topic'
  state TEXT, -- Two-letter code or 'US' for federal
  keywords JSONB NOT NULL, -- ["solar checkoff", "AB-1290", "ratepayer fee"]
  bill_ids TEXT[], -- ["CA-AB-1290", "CA-SB-846"]
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media mentions found
CREATE TABLE mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id),
  url TEXT UNIQUE NOT NULL,
  title TEXT,
  outlet TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  content TEXT, -- Full article markdown
  excerpt TEXT, -- First 300 chars
  sentiment TEXT, -- 'positive' | 'negative' | 'neutral'
  bill_referenced TEXT[], -- Bills mentioned in article
  entities JSONB, -- Extracted people, orgs, amounts
  source_type TEXT -- 'paywalled' | 'rss' | 'social'
);

-- Outlets and journalists (built over time)
CREATE TABLE outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  domain TEXT,
  type TEXT, -- 'local' | 'state' | 'national' | 'trade'
  state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE journalists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  outlet_id UUID REFERENCES outlets(id),
  email TEXT,
  twitter TEXT,
  beat TEXT[], -- ["energy", "environment", "legislature"]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users and subscriptions
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  telegram_id TEXT,
  tier TEXT DEFAULT 'solo', -- 'solo' | 'professional' | 'agency'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert preferences
CREATE TABLE alert_prefs (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  telegram_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT false,
  digest_frequency TEXT DEFAULT 'daily' -- 'realtime' | 'daily' | 'weekly'
);
```

---

## Search & Monitoring Strategy

### Query Construction
For each topic, generate search queries:

```javascript
// Example: California AB-1290
const queries = [
  'California "AB-1290"',
  'California "AB 1290"',
  'California "solar checkoff"',
  'California "distributed generation surcharge"'
];

// Geographic targeting
const siteQueries = [
  'site:latimes.com OR site:sacbee.com "AB-1290"',
  'site:capitolweekly.net "solar checkoff"'
];
```

### Scheduling
- **Immediate search:** When topic is created
- **Hourly:** High-priority topics (active bills, breaking issues)
- **Daily:** Standard topics
- **Weekly:** Archived topics

### Deduplication
1. Check URL against existing mentions (exact match)
2. Hash first 500 chars of content (fuzzy match for syndicated articles)
3. Title similarity check (85%+ = duplicate)

---

## Alert Logic

### Trigger Conditions
- New mention found (always alert)
- Coverage spike (3x average mentions in 24h)
- Sentiment shift (was neutral, now negative)
- New journalist (first-time coverage of this topic)
- Bill movement + media coverage (cross-reference LegiScan data)

### Alert Format (Telegram)
```
🚨 NEW MENTION: California AB-1290

📰 Sacramento Bee
👤 Author: Jane Smith
📅 Published: 2 hours ago
😐 Sentiment: Neutral

"California's new solar fee proposal faces growing opposition from consumer advocates..."

🔗 Read: [link]
📊 Total mentions today: 5 (↑ from avg 1.2/day)
```

---

## Sentiment Analysis

**Method:** AI extraction via Perplexity or local LLM

**Prompt:**
```
Analyze this article about [TOPIC]. 

1. Sentiment: positive, negative, or neutral toward [TOPIC]?
2. Key arguments: What are the top 2-3 points made?
3. Framing: How is [TOPIC] being presented? (consumer issue, industry lobby, environmental concern, etc.)

Article: [CONTENT]
```

Store: sentiment + summary (2-3 sentences)

---

## Pricing Tiers

| Tier | Price | Topics | States | Features |
|------|-------|--------|--------|----------|
| **Solo** | $49/mo | 5 | 2 | Basic monitoring, Telegram alerts, daily digest |
| **Professional** | $149/mo | 25 | All 50 | + Sentiment analysis, journalist DB, export reports |
| **Agency** | $499/mo | Unlimited | All 50 | + Multi-user, API access, white-label reports, priority support |

**Annual discount:** 2 months free (16% off)

---

## Development Phases

### Week 1: Core Backend
- [x] Architecture doc (this file)
- [ ] Database schema setup (Supabase)
- [ ] Topic CRUD API
- [ ] Firecrawl integration
- [ ] RSS feed parser
- [ ] Basic deduplication

### Week 2: Alerts & MVP
- [ ] Telegram alert system
- [ ] Search scheduler (cron jobs)
- [ ] Sentiment analysis integration
- [ ] Daily digest generator
- [ ] Landing page (NDStudio design)
- [ ] Beta signup flow

### Week 3: Intelligence Layer
- [ ] Entity extraction (bills, people, orgs)
- [ ] Journalist/outlet database
- [ ] Coverage attribution logic
- [ ] Analytics endpoints

### Week 4: Dashboard
- [ ] Next.js frontend scaffold
- [ ] Topic management UI
- [ ] Mention timeline view
- [ ] Outlet/journalist directory
- [ ] Export to PDF/Word

### Week 5-6: Polish & Launch
- [ ] User authentication (email/password)
- [ ] Billing integration (Stripe)
- [ ] Onboarding flow
- [ ] Marketing site content
- [ ] Beta launch (10 users)

### Week 7-8: Enterprise Features
- [ ] LegiScan API integration
- [ ] Cross-state pattern analysis
- [ ] API access for enterprise
- [ ] White-label report templates

---

## Success Metrics

**Beta (Month 1):**
- 10 paying beta users
- 50+ topics tracked
- 500+ mentions discovered
- <5 min average response time for new mentions

**Launch (Month 3):**
- 50 paying customers
- $5k MRR
- 95%+ uptime
- <1% churn

**Year 1:**
- 200 customers
- $40k MRR
- Profitable (cost < $5k/mo)
- 1-2 enterprise deals

---

## Cost Structure

**Monthly Costs (estimate):**
- Supabase (DB + hosting): $25-100
- Firecrawl API: $100-500 (depends on volume)
- SendGrid: $15-50
- Vercel: $20-100
- OpenAI/Perplexity API: $50-200
- Domain/misc: $20

**Total:** $230-970/mo depending on scale

**Break-even:** ~5-10 solo users or 2 professional users

---

## Next Steps

1. ✅ Architecture doc complete
2. [ ] Landing page design (NDStudio style)
3. [ ] Database setup (Supabase)
4. [ ] Backend skeleton (Node.js + Fastify)
5. [ ] First integration test (Firecrawl → DB → Telegram alert)
