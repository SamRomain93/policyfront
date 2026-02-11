-- Scan Status Tracking Migration
-- Adds timestamps to track when topics were last scanned

-- Add scan tracking columns to topics table
ALTER TABLE topics 
ADD COLUMN IF NOT EXISTS last_scan_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_scan_status TEXT CHECK (last_scan_status IN ('success', 'scanning', 'failed')),
ADD COLUMN IF NOT EXISTS last_scan_error TEXT,
ADD COLUMN IF NOT EXISTS next_scan_at TIMESTAMPTZ;

-- Add global scan tracking table for system-wide status
CREATE TABLE IF NOT EXISTS scan_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type TEXT NOT NULL CHECK (scan_type IN ('mentions', 'bills', 'full')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  topics_scanned INTEGER DEFAULT 0,
  mentions_found INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_topics_last_scan ON topics(last_scan_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_status_created ON scan_status(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_status_type ON scan_status(scan_type, created_at DESC);

-- Function to get latest scan status
CREATE OR REPLACE FUNCTION get_latest_scan_status(p_scan_type TEXT DEFAULT 'mentions')
RETURNS TABLE (
  scan_type TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT,
  topics_scanned INTEGER,
  mentions_found INTEGER,
  duration_seconds INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ss.scan_type,
    ss.started_at,
    ss.completed_at,
    ss.status,
    ss.topics_scanned,
    ss.mentions_found,
    EXTRACT(EPOCH FROM (COALESCE(ss.completed_at, NOW()) - ss.started_at))::INTEGER as duration_seconds
  FROM scan_status ss
  WHERE ss.scan_type = p_scan_type
  ORDER BY ss.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to start a new scan
CREATE OR REPLACE FUNCTION start_scan(p_scan_type TEXT DEFAULT 'mentions')
RETURNS UUID AS $$
DECLARE
  scan_id UUID;
BEGIN
  INSERT INTO scan_status (scan_type, status, started_at)
  VALUES (p_scan_type, 'running', NOW())
  RETURNING id INTO scan_id;
  
  RETURN scan_id;
END;
$$ LANGUAGE plpgsql;

-- Function to complete a scan
CREATE OR REPLACE FUNCTION complete_scan(
  p_scan_id UUID,
  p_status TEXT,
  p_topics_scanned INTEGER DEFAULT 0,
  p_mentions_found INTEGER DEFAULT 0,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE scan_status
  SET 
    completed_at = NOW(),
    status = p_status,
    topics_scanned = p_topics_scanned,
    mentions_found = p_mentions_found,
    error_message = p_error_message
  WHERE id = p_scan_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE scan_status IS 'Tracks system-wide scan runs for monitoring dashboard';
COMMENT ON COLUMN topics.last_scan_at IS 'Last time this topic was scanned for mentions';
COMMENT ON COLUMN topics.last_scan_status IS 'Result of last scan: success, scanning, failed';
