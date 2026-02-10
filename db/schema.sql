-- PolicyFront Database Schema
-- PostgreSQL (Supabase)

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  telegram_id TEXT,
  tier TEXT DEFAULT 'solo' CHECK (tier IN ('solo', 'professional', 'agency')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Topics being monitored
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bill', 'topic')),
  state TEXT,
  keywords JSONB NOT NULL DEFAULT '[]',
  bill_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outlets database
CREATE TABLE outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  domain TEXT,
  type TEXT CHECK (type IN ('local', 'state', 'national', 'trade')),
  state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journalists database
CREATE TABLE journalists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  email TEXT,
  twitter TEXT,
  beat TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media mentions found
CREATE TABLE mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  url TEXT UNIQUE NOT NULL,
  title TEXT,
  outlet TEXT,
  author TEXT,
  published_at TIMESTAMPTZ,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  content TEXT,
  excerpt TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  bill_referenced TEXT[] DEFAULT ARRAY[]::TEXT[],
  entities JSONB DEFAULT '{}',
  source_type TEXT CHECK (source_type IN ('paywalled', 'rss', 'social'))
);

-- Alert preferences
CREATE TABLE alert_prefs (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  telegram_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT false,
  digest_frequency TEXT DEFAULT 'daily' CHECK (digest_frequency IN ('realtime', 'daily', 'weekly'))
);

-- Indexes for performance
CREATE INDEX idx_topics_user_id ON topics(user_id);
CREATE INDEX idx_topics_active ON topics(active);
CREATE INDEX idx_mentions_topic_id ON mentions(topic_id);
CREATE INDEX idx_mentions_url ON mentions(url);
CREATE INDEX idx_mentions_published_at ON mentions(published_at DESC);
CREATE INDEX idx_mentions_discovered_at ON mentions(discovered_at DESC);
CREATE INDEX idx_journalists_outlet_id ON journalists(outlet_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
