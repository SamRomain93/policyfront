# Referral System Deployment Checklist

## Pre-Deployment

### 1. Database Migration
```bash
cd ~/clawd/policyfront
# Connect to your Supabase database
psql [your_supabase_connection_string] -f db/migration-referrals.sql
```

**Verify migration:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('referral_codes', 'referral_conversions');

-- Check functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%referral%';

-- Check user columns added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('name', 'trial_ends_at', 'subscription_status', 'subscription_credits');
```

### 2. Environment Variables (Verify)
```bash
# Should already be set, just verify:
echo $STRIPE_SECRET_KEY
echo $STRIPE_WEBHOOK_SECRET
# Test mode keys during testing, live keys for production
```

### 3. Auth Signup Endpoint Update
Update `/api/auth/signup` to handle new fields:
- `name` (required)
- `phone` (required)
- `company` (optional)
- `address` (optional)
- `referred_by_code` (optional)
- `trial_ends_at` (set if referred)
- `subscription_status` (set to 'trial' if referred)

**Example:**
```typescript
const { data: newUser, error } = await supabase
  .from('users')
  .insert({
    email: body.email,
    name: body.name,
    phone: body.phone,
    company: body.company,
    address: body.address,
    referred_by_code: body.referred_by_code,
    trial_ends_at: body.trial_ends_at,
    subscription_status: body.subscription_status || null,
    tier: body.tier || 'solo'
  })
  .select()
  .single()
```

### 4. Build & Test Locally
```bash
cd ~/clawd/policyfront/app
npm run dev
```

**Test flows:**
- [ ] Generate referral code at `/dashboard/settings`
- [ ] Hit 5-code limit
- [ ] Open referral signup link in incognito
- [ ] Complete signup with code
- [ ] Check referrer's dashboard for new signup
- [ ] Verify trial expiration modal (manually set past date)

## Deployment

### 1. Deploy to Vercel
```bash
cd ~/clawd/policyfront/app
git add .
git commit -m "Add referral system with viral growth loop"
git push origin main
```

Vercel will auto-deploy if connected to repo.

### 2. Test Stripe Webhooks
```bash
# Install Stripe CLI if not already
brew install stripe/stripe-cli/stripe

# Forward webhooks to local/staging
stripe listen --forward-to https://your-domain.com/api/stripe/webhook

# Trigger test payment
stripe trigger checkout.session.completed
```

Verify:
- [ ] Webhook received
- [ ] User marked active
- [ ] Referrer credited +1 month
- [ ] Conversion marked credited

### 3. Soft Launch to Waitlist
1. Pick 10-20 users from waitlist
2. Send onboarding email with referral code
3. Monitor analytics:
   - Signup completion rate
   - Code generation rate
   - Referral conversion rate

### 4. Monitor First Week
**Metrics to watch:**
- New signups via referral vs. direct
- Average referrals per user
- Trial → paid conversion rate
- Support tickets (confusion/bugs)

**Analytics queries:**
```sql
-- Total referral signups
SELECT COUNT(*) FROM users WHERE referred_by_code IS NOT NULL;

-- Most successful referrers
SELECT rc.user_id, u.email, COUNT(rcon.id) as referral_count
FROM referral_codes rc
JOIN referral_conversions rcon ON rc.code = rcon.referral_code
JOIN users u ON rc.user_id = u.id
GROUP BY rc.user_id, u.email
ORDER BY referral_count DESC
LIMIT 10;

-- Conversion funnel
SELECT 
  COUNT(*) FILTER (WHERE referred_by_code IS NOT NULL) as total_signups,
  COUNT(*) FILTER (WHERE subscription_status = 'trial') as active_trials,
  COUNT(*) FILTER (WHERE subscription_status = 'active') as paid_conversions
FROM users
WHERE referred_by_code IS NOT NULL;
```

## Post-Launch Optimization

### 1. Email Drip Campaign
Set up trial expiration reminders:
- Day 7: "23 days left"
- Day 27: "3 days left"
- Day 30: "Trial ends tomorrow"

**Implementation options:**
- Supabase Edge Functions (cron)
- Vercel Cron Jobs
- External service (SendGrid, Loops, etc.)

### 2. Referral Incentive Experiments
Test different rewards:
- Current: 1 month per paid conversion
- Test A: 2 weeks per signup (immediate)
- Test B: 1 month + $50 credit per 5 conversions

### 3. Leaderboard Feature
Add public/private leaderboard:
- Top referrers by conversions
- Badges (5 referrals, 10 referrals, etc.)
- Monthly winner gets swag/credits

### 4. Share Optimization
Add one-click sharing:
- Twitter: "Just joined PolicyFront. Get 30 days free: [link]"
- LinkedIn post template
- Email template with personalized message

## Rollback Plan

If critical issues found:

### Emergency Fix
```sql
-- Disable code generation temporarily
ALTER TABLE users ADD COLUMN referral_disabled BOOLEAN DEFAULT FALSE;

-- Update auth endpoint to check flag
-- (Add to signup validation)
```

### Full Rollback
```sql
-- Remove referral data (BACKUP FIRST!)
DROP TABLE referral_conversions;
DROP TABLE referral_codes;

-- Remove user columns
ALTER TABLE users DROP COLUMN referred_by_code;
ALTER TABLE users DROP COLUMN trial_ends_at;
ALTER TABLE users DROP COLUMN subscription_credits;
-- etc.
```

## Success Metrics (30 Days)

**Targets:**
- [ ] 20%+ of signups via referral
- [ ] 1.5+ avg referrals per active user
- [ ] 30%+ trial → paid conversion (referrals)
- [ ] <5% support tickets related to referrals

**Red Flags:**
- ⚠️ Code abuse (same person/IP creating multiple accounts)
- ⚠️ Low engagement (codes generated but not shared)
- ⚠️ High drop-off at signup form
- ⚠️ Payment failures post-trial

## Support Resources

**User FAQ:**
- How do I get a referral code?
- How many codes can I generate?
- When do I get my free month?
- What happens after my trial?
- Can I stack free months?

**Admin Tools:**
- View all referral codes: `SELECT * FROM referral_codes ORDER BY created_at DESC;`
- Check user's referrals: `SELECT * FROM referral_conversions WHERE referrer_id = '[user_id]';`
- Manually credit month: `UPDATE users SET subscription_credits = subscription_credits + 1, subscription_end_at = subscription_end_at + INTERVAL '30 days' WHERE id = '[user_id]';`
- Reset code generation limit: `UPDATE users SET codes_generated_this_period = 0, last_code_generation = NULL WHERE id = '[user_id]';`

## Contact

Questions/issues during deployment:
- Check implementation doc: `REFERRAL-SYSTEM-IMPLEMENTATION.md`
- Review code comments in route files
- Test in Stripe test mode before going live
