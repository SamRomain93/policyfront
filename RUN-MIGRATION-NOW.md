# 🚨 RUN DATABASE MIGRATION NOW

## Quick Start (2 minutes)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/girenjxxtxakvtgvgwtv
   - Login if needed

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Paste Migration SQL**
   - Open file: `~/clawd/policyfront/db/migration-referrals.sql`
   - Copy ALL contents
   - Paste into SQL Editor

4. **Run It**
   - Click "Run" button (or Cmd/Ctrl + Enter)
   - Wait 5-10 seconds
   - Should see "Success" message

5. **Verify**
   Run this to check it worked:
   ```sql
   -- Should return 2 tables
   SELECT table_name FROM information_schema.tables 
   WHERE table_name IN ('referral_codes', 'referral_conversions');
   
   -- Should show new user columns
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'users' 
   AND column_name IN ('name', 'trial_ends_at', 'subscription_credits');
   ```

## Done!

Migration complete. Vercel is deploying the app now.

Check deployment status:
https://vercel.com/samromain-2571s-projects/policyfront

Once deployed (2-3 minutes), test at:
- https://policyfront.com/dashboard/settings (generate codes)
- https://policyfront.com/signup-referral?code=test1234 (signup flow)

## Troubleshooting

**If error "column already exists":**
- Migration was already run, you're good!

**If error "table already exists":**
- Migration was already run, you're good!

**If other errors:**
- Screenshot the error
- Check the SQL line number
- Ping me the error message

## What This Does

Creates:
- `referral_codes` table (user-generated codes)
- `referral_conversions` table (signup tracking)
- New user columns (name, phone, trial info, credits)
- Helper functions (generate codes, apply credits)

Enables:
- Referral code generation (5 per 30 days)
- 30-day trial signups via code
- Automatic credit application (1 month per conversion)
- Settings page with referral dashboard
