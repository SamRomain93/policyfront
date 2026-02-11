-- Referral System Migration
-- Adds referral codes, tracking, and user credit system

-- Add referral fields to users table
ALTER TABLE users 
ADD COLUMN name TEXT,
ADD COLUMN phone TEXT,
ADD COLUMN address TEXT,
ADD COLUMN company TEXT,
ADD COLUMN referred_by_code TEXT,
ADD COLUMN trial_ends_at TIMESTAMPTZ,
ADD COLUMN subscription_credits INTEGER DEFAULT 0,
ADD COLUMN last_code_generation TIMESTAMPTZ,
ADD COLUMN codes_generated_this_period INTEGER DEFAULT 0,
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN stripe_subscription_id TEXT,
ADD COLUMN subscription_status TEXT CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled', 'inactive')),
ADD COLUMN subscription_end_at TIMESTAMPTZ;

-- Referral codes table
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  uses_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral conversions tracking
CREATE TABLE referral_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  referee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  signed_up_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ,
  credited BOOLEAN DEFAULT false,
  CONSTRAINT unique_referee UNIQUE (referee_id)
);

-- Indexes for performance
CREATE INDEX idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_conversions_referrer_id ON referral_conversions(referrer_id);
CREATE INDEX idx_referral_conversions_referee_id ON referral_conversions(referee_id);
CREATE INDEX idx_users_referred_by_code ON users(referred_by_code);
CREATE INDEX idx_users_trial_ends_at ON users(trial_ends_at);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);

-- Function to generate random referral code (8 chars, lowercase alphanumeric)
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can generate more codes
CREATE OR REPLACE FUNCTION can_generate_code(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  last_gen TIMESTAMPTZ;
  codes_count INTEGER;
BEGIN
  SELECT last_code_generation, codes_generated_this_period 
  INTO last_gen, codes_count
  FROM users 
  WHERE id = p_user_id;
  
  -- If never generated or more than 30 days ago, reset and allow
  IF last_gen IS NULL OR last_gen < NOW() - INTERVAL '30 days' THEN
    UPDATE users 
    SET codes_generated_this_period = 0, 
        last_code_generation = NOW() 
    WHERE id = p_user_id;
    RETURN TRUE;
  END IF;
  
  -- Check if under limit
  RETURN codes_count < 5;
END;
$$ LANGUAGE plpgsql;

-- Function to generate a new referral code for user
CREATE OR REPLACE FUNCTION create_referral_code(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  can_generate BOOLEAN;
BEGIN
  -- Check if user can generate more codes
  SELECT can_generate_code(p_user_id) INTO can_generate;
  
  IF NOT can_generate THEN
    RAISE EXCEPTION 'Code generation limit reached. Wait 30 days from last generation.';
  END IF;
  
  -- Generate unique code
  LOOP
    new_code := generate_referral_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM referral_codes WHERE code = new_code);
  END LOOP;
  
  -- Insert the code
  INSERT INTO referral_codes (user_id, code) VALUES (p_user_id, new_code);
  
  -- Update user's generation tracking
  UPDATE users 
  SET codes_generated_this_period = codes_generated_this_period + 1,
      last_code_generation = NOW()
  WHERE id = p_user_id;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to apply referral credit when someone pays
CREATE OR REPLACE FUNCTION apply_referral_credit(p_referee_id UUID)
RETURNS VOID AS $$
DECLARE
  v_conversion_record RECORD;
BEGIN
  -- Get the conversion record
  SELECT * INTO v_conversion_record
  FROM referral_conversions
  WHERE referee_id = p_referee_id
  AND credited = false
  LIMIT 1;
  
  IF v_conversion_record.referrer_id IS NOT NULL THEN
    -- Add 1 month credit to referrer
    UPDATE users
    SET subscription_credits = subscription_credits + 1,
        subscription_end_at = CASE
          WHEN subscription_end_at IS NULL THEN NOW() + INTERVAL '30 days'
          WHEN subscription_end_at < NOW() THEN NOW() + INTERVAL '30 days'
          ELSE subscription_end_at + INTERVAL '30 days'
        END
    WHERE id = v_conversion_record.referrer_id;
    
    -- Mark as credited
    UPDATE referral_conversions
    SET converted_at = NOW(),
        credited = true
    WHERE id = v_conversion_record.id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to increment uses_count on a referral code
CREATE OR REPLACE FUNCTION increment_referral_uses(p_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE referral_codes
  SET uses_count = uses_count + 1
  WHERE code = p_code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE referral_codes IS 'User-generated referral codes for 30-day trial signups';
COMMENT ON TABLE referral_conversions IS 'Tracks referral signups and conversion to paid';
COMMENT ON COLUMN users.subscription_credits IS 'Number of free months earned from referrals';
COMMENT ON COLUMN users.codes_generated_this_period IS 'Codes generated in rolling 30-day window (max 5)';
