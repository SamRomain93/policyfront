# PolicyFront.io - Landing Page Design

**Design Philosophy:** NDStudio-inspired. Warm, confident, premium intelligence service.

---

## Brand Identity

**Logo:** "PolicyFront" in Instrument Serif, bold weight  
**Tagline:** "The front line for policy intelligence"  
**Color Palette:**
- Background: `#FAFAF8` (warm white)
- Text: `#1A1A1A` (near-black)
- Accent: `#2563EB` (strategic blue, not government blue)
- Muted: `#6B6B6B` (secondary text)
- Card: `rgba(255, 255, 255, 0.6)` (frosted glass)

**Typography:**
- Headlines: Instrument Serif, bold, 48-80px
- Body: Inter, 18px, relaxed line-height
- Captions: Inter, 14px, muted color

---

## Page Structure

### Hero Section
**One Message:** "Know what's happening in the legislature AND what story is being told about it."

**Layout:**
```
[Warm cream background #FAFAF8]

PolicyFront                                    [Sign In] [Start Free Trial]

                    The front line for
                  policy intelligence

        Track bills. Monitor media. Stay ahead of the narrative.

                [Get Early Access →]

           Used by public affairs professionals at
        [Logo: Sunrun] [Logo: FlaSEIA] [Logo: RPOF] [Logo: Athos]
```

**Visual Treatment:**
- Large, centered headline split across 2-3 lines
- Generous whitespace (200px+ top/bottom padding)
- Single CTA button (blue, rounded, 24px padding)
- Logo carousel at bottom (subtle scroll animation)
- No hero image - let typography breathe

---

### Problem Section
**One Message:** "Manual tracking is killing your productivity"

**Layout:**
```
        The old way is broken

You're juggling LegiScan for bills,
Google Alerts for news, and spreadsheets to
connect the dots.

PolicyFront does it all in one place.
```

**Visual Treatment:**
- Simple two-column layout on desktop
- Left: "The old way" (crossed-out text, muted)
- Right: "PolicyFront does it all" (bold, accent color)
- Warm gray background (#F5F5F0) to separate from hero

---

### How It Works
**One Message:** "Three steps from chaos to clarity"

**Layout:**
```
                How it works

    1. Track                2. Monitor              3. Alert
 Tell us what bills      We scan news from      Get Telegram alerts
 and topics matter       paywalled sources      the moment coverage
 to you                  + open media           drops

[Card with icon]        [Card with icon]        [Card with icon]
```

**Visual Treatment:**
- Three frosted-glass cards
- Numbered steps (large serif numbers)
- Icons: Simple line illustrations (bill → newspaper → bell)
- Cards have subtle hover lift effect

---

### Features Grid
**One Message:** "Everything you need to stay ahead"

**Layout:**
```
          What you get with PolicyFront

[Bill Tracking]          [Media Monitoring]       [Sentiment Analysis]
Monitor bills by         Scan Politico Pro,       AI-powered framing
state or topic           Bloomberg Gov, local     detection shows how
                         press, and more          stories shift

[Journalist Database]    [Coverage Attribution]   [Cross-State Patterns]
Build contacts from      Link media mentions      Spot coordination
coverage                 to bill movements        across states
```

**Visual Treatment:**
- 3x2 grid on desktop, stacked on mobile
- Each feature card:
  - Warm white background
  - Rounded corners (12px)
  - Left border accent (4px blue)
  - Icon or illustration
  - 2-3 sentence description

---

### Pricing Section
**One Message:** "Pricing that scales with you"

**Layout:**
```
                    Pricing

      Solo              Professional          Agency
      $49/mo            $149/mo              $499/mo
      
   5 topics tracked   25 topics            Unlimited
   2 states           All 50 states        All 50 states
   Telegram alerts    + Sentiment          + Multi-user
   Daily digest       + Export reports     + API access
                                           + White-label

   [Start Free Trial] [Start Free Trial]  [Contact Sales]
```

**Visual Treatment:**
- Three pricing cards
- Center card (Professional) elevated slightly
- Muted text for features
- Bold for price and tier name
- "Most popular" badge on Professional tier
- All prices shown monthly (annual discount mentioned below)

---

### Social Proof
**One Message:** "Built by someone who lives this pain daily"

**Layout:**
```
        Built by a public affairs professional

"I got tired of paying $2,000/month for Meltwater and
still missing coverage. PolicyFront gives me everything
I need for less than lunch."

— Sam Romain
Public Affairs Manager, Sunrun
Chairman, Polk County Republican Executive Committee
```

**Visual Treatment:**
- Large pull quote (Instrument Serif italic, 32px)
- Attribution in smaller text below
- Soft gray background card
- Optional: Photo or logo

---

### CTA Section
**One Message:** "Start tracking today"

**Layout:**
```
         Ready to stay ahead of the story?

                [Get Early Access →]

            No credit card required
        Cancel anytime • 14-day free trial
```

**Visual Treatment:**
- Simple centered text
- Large blue CTA button
- Muted fine print below
- Warm cream background returns

---

### Footer
**Layout:**
```
PolicyFront                     Product              Company
The front line for             Features             About
policy intelligence            Pricing              Contact
                               Roadmap              Privacy
                                                    Terms

                        © 2026 PolicyFront
```

**Visual Treatment:**
- Minimal, clean
- Four columns on desktop, stacked on mobile
- Small text (14px)
- Muted links

---

## Design Tokens

```css
:root {
  /* Colors */
  --bg-primary: #FAFAF8;
  --bg-secondary: #F5F5F0;
  --bg-card: rgba(255, 255, 255, 0.6);
  --text-primary: #1A1A1A;
  --text-secondary: #6B6B6B;
  --text-muted: #9B9B9B;
  --accent-blue: #2563EB;
  --border: #E5E5E0;

  /* Typography */
  --font-serif: 'Instrument Serif', Georgia, serif;
  --font-sans: 'Inter', -apple-system, sans-serif;
  
  --text-hero: clamp(3rem, 5vw, 5rem);      /* 48-80px */
  --text-section: clamp(2rem, 3vw, 3rem);   /* 32-48px */
  --text-body: 1.125rem;                    /* 18px */
  --text-caption: 0.875rem;                 /* 14px */
  
  --leading-tight: 1.1;
  --leading-relaxed: 1.6;

  /* Spacing */
  --space-section: clamp(5rem, 10vw, 10rem); /* 80-160px */
  --space-card: 2rem;                        /* 32px */
  
  /* Border radius */
  --radius-card: 12px;
  --radius-button: 8px;
}
```

---

## Mobile Considerations

- Hero text: 36-48px (smaller than desktop 80px)
- Single column layout for all sections
- Feature cards stack vertically
- Pricing cards stack vertically
- Logo carousel scrolls horizontally
- Navigation collapses to hamburger menu
- Touch targets: min 44px

---

## Performance Targets

- First Contentful Paint: <1s
- Time to Interactive: <2s
- Total bundle size: <500KB
- Lighthouse score: 95+

---

## Copy Principles

- **Direct, not clever:** "Track bills. Monitor media. Stay ahead."
- **No buzzwords:** Avoid "synergy," "rockstar," "cutting-edge"
- **Show, don't tell:** "Scan Politico Pro" beats "access premium sources"
- **One idea per section:** Each viewport delivers exactly one message
- **Active voice:** "Get alerts" beats "Alerts are sent"

---

## Next Steps

1. ✅ Design spec complete
2. [ ] Build Next.js landing page
3. [ ] Implement responsive design
4. [ ] Add subtle scroll animations
5. [ ] Test on mobile devices
6. [ ] Deploy to Vercel
