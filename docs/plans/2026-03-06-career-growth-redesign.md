# Career Growth Page Redesign

**Date:** 2026-03-06
**Status:** Approved

## Problem

The Career Growth page confuses users. They don't understand what the page does, how it serves them, or how to navigate the data. The three disconnected tabs (Job Market, Upskilling, Commute) lack narrative flow. The pre-CV state shows overwhelming market data with a tiny upload prompt buried mid-page.

## Design Principle

The page serves a **dual purpose**:
1. **Montgomery's Job Pulse** — city-wide job market data, trends, industries (always visible)
2. **Your Career Growth** — personalized matches, skill gaps, training paths (unlocked via CV upload)

## State 1: No CV Uploaded

Layout is a single scrollable page:

1. **Page header** — "Career Growth" with subtitle "Montgomery's job market + your personal path"
2. **Upload CTA (prominent, top of page)** — bordered card with value props:
   - "Upload your CV to unlock personal matches"
   - Bullet points: Match scores, Skill gaps, Training paths, Commute planning
   - Upload zone inside the card
3. **Montgomery Job Pulse section** — all existing market data:
   - MarketPulse metric cards (Active Jobs, Top Sector, Entry Level %, Avg Competition)
   - Industry + In-Demand Roles bar charts
   - Trending Skills bar
4. **All Montgomery Jobs** — search, filters, job cards (no match %, just listings)

## State 2: CV Loaded

Two tabs: **"Job Market"** | **"Growth Plan"**

### Tab 1: Job Market (city pulse + personal matches)

1. **Compact horizontal profile bar** (replaces the 300px sidebar):
   - Avatar + name + current title | X skills | Y/Z job matches | "Re-upload CV" link
   - Full-width, ~60px tall, sits at top of content area
2. **MarketPulse** — same 4 metric cards + bar charts
3. **Trending Skills** — same bar chart
4. **"Jobs Ranked by Your Match"** — search, filters, personalized job cards with match %, matched/missing skills

### Tab 2: Growth Plan (skills + commute)

1. **Impact header** — current match rate → projected rate → improvement
2. **Quick Wins** — skills learnable in ≤2 weeks
3. **Highest-Impact Skills** — skill path cards with training options
4. **Commute Overview** — map + sorted commute list

## Key Changes from Current

| What | Before | After |
|------|--------|-------|
| Profile sidebar | 300px left sidebar | Compact horizontal bar (saves width) |
| Pre-CV experience | Full data dump + tiny upload prompt | Prominent upload CTA at top + market data below |
| Page narrative | 3 disconnected tabs | 2 meaningful sections: Market + Growth |
| Section headers | Minimal | Clear headers explaining dual purpose |
| Upload prompt | Dashed border box buried in job list | Top-of-page card with value propositions |

## Files to Modify

- `cv/CvUploadView.tsx` — restructure layout, add onboarding hero, change to 2 tabs
- `cv/CitizenProfileBar.tsx` — convert from sidebar to compact horizontal bar
- `cv/JobMatchPanel.tsx` — remove the inline upload prompt, clean up header
- No changes needed to: MarketPulse, TrendingSkillsBar, JobMatchCard, JobFilters, UpskillingPanel, CommutePanel (content stays the same, just reorganized)
