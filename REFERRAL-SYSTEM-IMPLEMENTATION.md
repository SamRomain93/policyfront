# Referral System Implementation

## Overview
Complete viral growth loop with referral codes, trial signups, and referrer credits.

## What Was Built

### 1. Database Schema (`db/migration-referrals.sql`)

**New Tables:**
- `referral_codes` - User-generated codes (8 chars, lowercase alphanumeric)
- `referral_conversions` - Tracks signups → paid conversions

**Users Table Additions:**
- `name`, `phone`, `address`, `company` - Profile fields
- `referred_by_code` - Tracks who referred them
- `trial_ends_at` - 30-day trial expiration
- `subscription_credits` - Free months earned
- `last_code_generation` - Rolling 30-day window tracking
- `codes_generated_this_period` - Max 5 codes per 30 days
- `stripe_customer_id`, `stripe_subscription_id` - Payment tracking
- `subscription_status` - trial/active/past_due/canceled/inactive
- `subscription_end_at` - When subscription expires

**Helper Functions:**
- `generate_referral_code()` - Creates unique 8-char codes
- `can_generate_code(user_id)` - Checks rolling 30-day limit
- `create_referral_code(user_id)` - Full code generation with limits
- `apply_referral_credit(referee_id)` - Awards month to referrer
- `increment_referral_uses(code)` - Increments use counter

### 2. API Endpoints

**`/api/referrals/generate` (POST)**
- Generates new referral code for user
- Enforces 5 codes per rolling 30 days
- Returns code + remaining count

**`/api/referrals/validate` (POST)**
- Validates referral code exists
- Returns referrer name for UI
- Used before signup

**`/api/referrals/stats` (GET)**
- Fetches user's codes, signups, conversions
- Returns referral list (name + status only)
- Shows generation limits/countdown

**`/api/referrals/convert` (POST)**
- Records referral signup
- Increments code uses
- Creates conversion tracking record

### 3. Stripe Webhook Update (`/api/stripe/webhook/route.ts`)

**On `checkout.session.completed`:**
1. Updates user to active subscription
2. Finds referral conversion record
3. Awards referrer +1 month credit
4. Extends referrer's `subscription_end_at`
5. Marks conversion as credited

### 4. Referral Signup Flow (`/signup-referral/page.tsx`)

**Step 1: Code Entry**
- User enters 8-character code
- Live validation against database
- Shows referrer name on success

**Step 2: Account Creation**
- Full signup form (name, email, password, phone required)
- Company & address optional
- Creates account with `trial_ends_at = now() + 30 days`
- Records referral conversion

### 5. Account Settings Page (`/dashboard/settings/page.tsx`)

**Three Tabs:**

**Profile:**
- Name, email, phone (required)
- Company, address (optional)
- "We send gifts to our top users!" hint

**Billing:**
- Placeholder (coming soon)

**Referrals:**
- Stats cards: Total Signups, Active Trials, Paid Conversions, Months Earned
- Referral codes list with copy code/link buttons
- Generation limit display (X/5 remaining, countdown to reset)
- Referrals list: Name + Status (trial/paid/inactive)

### 6. Navigation Updates

**Dashboard Sidebar:**
- Added "Settings" nav item with gear icon

**Landing Page:**
- Added "Have a referral code? Sign up here" link below waitlist form

## User Flow

### Generating Codes
1. User goes to Settings → Referrals
2. Clicks "Generate New Code"
3. System creates unique 8-char code
4. User can generate up to 5 codes every rolling 30 days
5. Copy code or shareable link: `https://policyfront.com/signup-referral?code=abc123xy`

### Referral Signup
1. New user receives referral link
2. Enters code → validated
3. Fills signup form
4. Account created with 30-day Solo trial
5. Referral conversion tracked

### Earning Credits
1. Referee uses product during trial
2. Referee adds payment method + pays
3. Stripe webhook fires
4. Referrer gets +1 month added to subscription
5. Referral marked as "paid" in dashboard

## Business Logic

### Code Generation Limits
- **Limit:** 5 codes per user
- **Window:** Rolling 30 days from `last_code_generation`
- **Reset:** Automatic when 30 days pass
- **Display:** "You can generate more in X days"

### Trial Duration
- **Length:** 30 days from signup
- **Access:** Full Solo tier features
- **Expiration:** Soft lock (see below)

### Credit System
- **Reward:** 1 free month per paying referral
- **Stacking:** Unlimited (5 referrals = 5 months)
- **Application:** Extends `subscription_end_at` by 30 days
- **Tracking:** `subscription_credits` counter

### Referral Privacy
- Referrer sees: Name + Status
- Referrer does NOT see: Email, phone, address, company
- Purpose: Enable personal check-ins without data exposure

## Soft Lock Modal ✅ COMPLETE

**Location:** `/dashboard/components/TrialExpiredModal.tsx`

**Features:**
- Blur backdrop (non-dismissible)
- Friendly messaging with user's name
- List of preserved features
- "Choose a Plan" CTA → redirects to billing
- Support email link

**Integration:** AuthGuard automatically checks `trial_ends_at` and `subscription_status` on every session load and shows modal when trial expired.

### 2. Trial Expiration Emails
**Day 7:** "23 days left in your trial"
**Day 27:** "3 days left - add payment to keep access"
**Day 30:** "Trial ends tomorrow"

**Implementation:** Cron job or scheduled function checking `trial_ends_at`

### 3. Auth Signup Updates
Update `/api/auth/signup` to handle:
- `referred_by_code` field
- `trial_ends_at` field
- `subscription_status` = 'trial'
- Profile fields (name, phone, address, company)

### 4. Run Migration
```bash
# Apply the migration
cd ~/clawd/policyfront
psql [connection_string] -f db/migration-referrals.sql
```

## Testing Checklist

- [ ] Generate referral code (Settings → Referrals)
- [ ] Hit 5-code limit, verify countdown message
- [ ] Copy referral link, open in incognito
- [ ] Enter code, verify referrer name shows
- [ ] Complete signup, verify 30-day trial
- [ ] Check referrer's dashboard, verify signup appears
- [ ] Simulate payment (Stripe test mode)
- [ ] Verify referrer gets +1 month credit
- [ ] Verify conversion marked "paid"
- [ ] Wait 30 days OR manually set `trial_ends_at` to past
- [ ] Login, verify soft lock modal (when built)

## Code Locations

```
policyfront/
├── db/
│   └── migration-referrals.sql          # Database schema
├── app/
│   ├── signup-referral/
│   │   └── page.tsx                     # Referral signup flow
│   ├── dashboard/
│   │   ├── settings/
│   │   │   └── page.tsx                 # Account settings + referrals
│   │   └── layout.tsx                   # Added Settings nav item
│   ├── components/
│   │   └── WaitlistForm.tsx             # Added referral link
│   └── api/
│       ├── referrals/
│       │   ├── generate/route.ts        # Generate codes
│       │   ├── validate/route.ts        # Validate codes
│       │   ├── stats/route.ts           # Fetch user stats
│       │   └── convert/route.ts         # Record conversion
│       └── stripe/
│           └── webhook/route.ts         # Updated with credit logic
```

## Environment Variables

No new environment variables needed. Uses existing:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- Supabase connection (via `getSupabase()`)

## Notes

- Codes are lowercase alphanumeric (no confusion with 0/O, 1/l/I)
- Rolling 30-day window prevents gaming (can't delete codes to reset)
- Privacy-first: referrers can't harvest contact info
- Soft lock preserves data: no account deletion on trial end
- Credits stack infinitely: reward power users
- Referrer motivation: personal check-ins → higher conversion

## Next Steps

1. Run migration on production DB
2. Build soft lock modal component
3. Test full flow in Stripe test mode
4. Set up trial expiration email alerts
5. Launch to waitlist users with codes
