# Plan: Career Growth Page — Interactive Charts & Cards

**Date**: 2026-03-05
**Status**: Ready to implement
**Goal**: Make the Career Growth page fully interactive — clicking any chart bar, skill, or metric filters the job list instantly. Cards get richer detail presentation.

---

## 1. Clickable Bar Charts (MarketPulse)

**Current state**: MarketPulse renders static CSS bar charts. No click handlers.

**Enhancement**: Each bar row in "Hiring by Industry" and "In-Demand Roles" becomes a clickable filter.

### Changes to `MarketPulse.tsx`
- Add `onFilterByIndustry: (industry: string) => void` and `onFilterByRole: (role: string) => void` callback props
- Add `activeIndustry?: string` and `activeRole?: string` props for visual highlight
- `HorizontalBarRow` gains `onClick`, `isActive` props — active bar gets primary color + bold text + ring outline
- Clicking an already-active bar deselects it (toggle behavior)

### Changes to `JobMatchPanel.tsx`
- Pass filter callbacks from `JobMatchPanel` → `MarketPulse`
- When a bar is clicked, update `filters.industry` (for industry bars) or add a new `filters.titleKeyword` field (for role bars)
- Job list re-filters instantly via existing `useMemo`

### Changes to `JobFilters.tsx`
- Add `titleKeyword: string` to `JobFilterState`
- Show active keyword filter as a removable chip above or within the filter bar
- Update `countActiveFilters` and `createDefaultFilters`

---

## 2. Clickable Trending Skills Bar

**Current state**: `TrendingSkillsBar` renders skill bars with no click interaction.

**Enhancement**: Clicking a skill bar filters jobs to only those requiring that skill.

### Changes to `TrendingSkillsBar.tsx`
- Add `onFilterBySkill: (skill: string) => void` and `activeSkill?: string` props
- Each skill row becomes a `<button>` with hover/active states
- Active skill gets highlighted bar + bold label

### Changes to `JobMatchPanel.tsx`
- When a trending skill is clicked, set `searchQuery` to that skill name (simplest approach — reuses existing search filter)
- Or: add `filters.skill` to `JobFilterState` for a dedicated skill filter

---

## 3. Enhanced Job Cards — Quick-View Popup

**Current state**: Cards expand inline (accordion). Only one card at a time.

**Enhancement**: Add a quick-view hover preview + keep the accordion expand for full details.

### Option A — Hover tooltip (lightweight)
- On hover (desktop), show a small tooltip with: salary, match %, top 3 skills, job type
- On click, expand as current behavior
- Low effort, no new components needed

### Option B — Side panel / drawer (recommended)
- Clicking "Full Details" opens a right-side drawer (overlays the guide panel area) with:
  - Full job description (if available in data)
  - All skills as interactive badges
  - Similar jobs section
  - "Why you match" section (when CV uploaded)
- Back button returns to list

**Recommendation**: Option A (hover tooltip) for now — it's fast to build and doesn't need new data. Option B can come later if more job description data is scraped.

---

## 4. Metric Cards as Filters

**Current state**: The 4 metric cards (Active Jobs, Top Sector, Entry Level, Avg Competition) are display-only.

**Enhancement**: Make "Top Sector" and "Entry Level" cards clickable:
- **Top Sector card**: Click → filters to that industry (same as clicking the industry bar)
- **Entry Level card**: Click → toggles `filters.seniority` to "Entry level"
- Both cards get a subtle hover state and cursor-pointer
- Active state shows a ring/border highlight

---

## Implementation Order

| Step | File(s) | Description |
|------|---------|-------------|
| 1 | `JobFilters.tsx` | Add `titleKeyword` to filter state |
| 2 | `MarketPulse.tsx` | Add click handlers + active state to bar charts |
| 3 | `JobMatchPanel.tsx` | Wire MarketPulse callbacks → filter state, add titleKeyword to filtering logic |
| 4 | `TrendingSkillsBar.tsx` | Add click handler + active state |
| 5 | `JobMatchPanel.tsx` | Wire TrendingSkillsBar click → search/filter |
| 6 | `MarketPulse.tsx` | Make metric cards clickable (Top Sector + Entry Level) |
| 7 | `JobMatchCard.tsx` | Add hover tooltip for quick preview |

**Estimated files modified**: 4 (MarketPulse, JobFilters, JobMatchPanel, TrendingSkillsBar, JobMatchCard)
**New files**: 0
**Breaking changes**: None — all additive
