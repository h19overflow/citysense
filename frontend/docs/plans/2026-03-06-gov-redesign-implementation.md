# Government-Inspired Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Shift the MontgomeryAI color system from crimson/warm-parchment to navy/cool-white, matching government website aesthetics while keeping Montgomery identity (gold accents, capitol dome).

**Architecture:** CSS-variable-driven redesign. Most components use Tailwind's `bg-primary`, `text-secondary`, etc., which resolve to CSS custom properties in `index.css`. Changing the variables propagates automatically. Only the TopBar, Splash page, and a few hardcoded references need direct edits.

**Tech Stack:** Tailwind CSS, React, CSS custom properties (HSL format)

---

### Task 1: Update CSS color variables

**Files:**
- Modify: `src/index.css`

**Step 1: Replace all color token values**

In `src/index.css`, update the `:root` block. Use HSL values (without `hsl()` wrapper — Tailwind expects raw HSL):

| Variable | Old HSL | New HSL | New Hex |
|----------|---------|---------|---------|
| `--background` | `36 43% 96%` | `0 0% 98%` | #FAFAFA |
| `--foreground` | `0 0% 10%` | `0 0% 11%` | #1b1b1b |
| `--card` | `0 0% 100%` | `0 0% 100%` | #FFFFFF (keep) |
| `--card-foreground` | `0 0% 10%` | `0 0% 11%` | #1b1b1b |
| `--popover` | `0 0% 100%` | `0 0% 100%` | #FFFFFF (keep) |
| `--popover-foreground` | `0 0% 10%` | `0 0% 11%` | #1b1b1b |
| `--primary` | `352 63% 37%` | `213 59% 30%` | #1a4480 |
| `--primary-foreground` | `36 43% 96%` | `0 0% 100%` | #FFFFFF |
| `--secondary` | `214 58% 27%` | `218 51% 20%` | #162e51 |
| `--secondary-foreground` | `36 43% 96%` | `0 0% 100%` | #FFFFFF |
| `--muted` | `30 18% 93%` | `0 0% 94%` | #F0F0F0 |
| `--muted-foreground` | `0 0% 40%` | `213 4% 47%` | #71767a |
| `--accent` | `37 63% 47%` | `37 63% 47%` | #C8882A (keep) |
| `--accent-foreground` | `0 0% 100%` | `0 0% 100%` | #FFFFFF (keep) |
| `--destructive` | `4 70% 46%` | `3 71% 53%` | #d83933 |
| `--destructive-foreground` | `0 0% 100%` | `0 0% 100%` | #FFFFFF (keep) |
| `--success` | `153 42% 30%` | `153 42% 30%` | #2D6A4F (keep) |
| `--success-foreground` | `0 0% 100%` | `0 0% 100%` | #FFFFFF (keep) |
| `--border` | `30 18% 88%` | `204 6% 87%` | #DFE1E2 |
| `--input` | `30 18% 93%` | `0 0% 94%` | #F0F0F0 |
| `--ring` | `352 63% 37%` | `213 59% 30%` | #1a4480 |
| `--radius` | `1rem` | `0.5rem` | 8px |

**Step 2: Update Montgomery-specific tokens**

Replace the block of Montgomery-specific custom properties:

```css
--montgomery-blue: 213 59% 30%;
--amber-gold: 37 63% 47%;
--charcoal: 0 0% 11%;
--pine-green: 153 42% 30%;
--alert-red: 3 71% 53%;
--input-gray: 0 0% 94%;
```

Remove `--crimson` and `--parchment` tokens (no longer used).

**Step 3: Update sidebar tokens**

```css
--sidebar-background: 0 0% 98%;
--sidebar-foreground: 0 0% 11%;
--sidebar-primary: 213 59% 30%;
--sidebar-primary-foreground: 0 0% 100%;
--sidebar-accent: 37 63% 47%;
--sidebar-accent-foreground: 0 0% 100%;
--sidebar-border: 204 6% 87%;
--sidebar-ring: 213 59% 30%;
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Clean build, no errors. The majority of the app auto-updates since components use `bg-primary`, `text-secondary`, `border-border`, etc.

---

### Task 2: Redesign TopBar

**Files:**
- Modify: `src/components/app/TopBar.tsx`

**Step 1: Change TopBar to white background with navy stripe**

Replace the entire TopBar component. Key changes:
- Add a 3px top border in navy (`border-t-[3px] border-primary`)
- Background: white (`bg-white`)
- Text: secondary (dark navy `text-secondary`)
- Subtitle: cool gray (`text-muted-foreground`)
- Capitol dome icon: remove `brightness-200` filter (it's dark by default, works on white)
- Language toggle: navy-styled pills instead of white/transparent

The container div changes from:
```
className="flex items-center justify-between px-5 py-2.5 bg-primary shrink-0"
```
to:
```
className="flex items-center justify-between px-5 py-2.5 bg-white border-t-[3px] border-primary border-b border-border shrink-0"
```

The icon container changes from `bg-white/15` to `bg-primary/10`.
The icon removes `brightness-200`.
Title text changes from `text-primary-foreground` to `text-secondary`.
Subtitle changes from `text-primary-foreground/50` to `text-muted-foreground`.
Active language button changes from `bg-white text-primary` to `bg-primary text-white`.
Inactive language button changes from `text-primary-foreground/50` to `text-muted-foreground`.
The toggle container changes from `bg-white/10` to `bg-muted`.

**Step 2: Verify build**

Run: `npm run build`

---

### Task 3: Update Landing Page (Splash.tsx)

**Files:**
- Modify: `src/pages/Splash.tsx`

**Step 1: Update hero section colors**

In `HeroSection`:
- Change `bg-primary magnolia-bg` to `bg-secondary` (dark navy hero)
- Change button from `bg-white text-primary` to `bg-white text-secondary`
- Capitol dome icon: keep `brightness-200` (needs to be white on dark navy bg)
- Title/subtitle: use `text-white` and `text-white/70` instead of `text-primary-foreground`

In `CTASection`:
- Already uses `bg-secondary` (dark navy) — this now resolves to `#162e51` which is correct
- Change button from `bg-white text-secondary` — this auto-updates correctly

In `FeatureCard`:
- Change icon container from `bg-primary/10` and `text-primary` — these auto-update via CSS vars

In `Footer`:
- Change dome icon: remove `opacity-50` if desired, it's fine either way

**Step 2: Verify build**

Run: `npm run build`

---

### Task 4: Update FlowSidebar background reference

**Files:**
- Modify: `src/components/app/FlowSidebar.tsx`

**Step 1: Verify sidebar uses CSS variables**

The sidebar uses `bg-[hsl(var(--sidebar-background))]` which auto-updates. No code changes needed if the CSS vars are correctly set in Task 1.

However, check the active/inactive button styling:
- Active: `bg-primary text-primary-foreground` — auto-updates to navy/white
- Inactive: `text-muted-foreground hover:text-foreground hover:bg-muted` — auto-updates

**No changes needed** — verify visually only.

---

### Task 5: Fix hardcoded mockup TopBar hex (if mockup pages are in scope)

**Files:**
- Modify: `src/components/mockup/TopBar.tsx` (line 68)

**Step 1: Update hex references**

Change:
```tsx
stroke={isCrimson ? "#FAF7F2" : "#9B2335"}
```
to:
```tsx
stroke={isCrimson ? "#FFFFFF" : "#1a4480"}
```

This file is for the mockup/demo view (Index.tsx). If the mockup pages are not user-facing, this is low priority.

---

### Task 6: Remove stale `--crimson` and `--parchment` CSS references

**Files:**
- Modify: `src/index.css`

**Step 1: Search for any remaining references to removed tokens**

Run a grep for `crimson` and `parchment` across all `.tsx`, `.ts`, `.css` files in `src/`. If any component uses `bg-crimson`, `text-parchment`, etc., update them:
- `bg-crimson` → `bg-primary`
- `text-parchment` → `text-primary-foreground` or `text-background`
- `bg-parchment` → `bg-background`

**Step 2: Clean up Index.tsx (mockup showcase page)**

The `Index.tsx` page references `text-parchment/70`, `text-parchment/50`, `text-parchment`, and `bg-charcoal`. Update:
- `bg-charcoal` → `bg-foreground` or `bg-[#1b1b1b]`
- `text-parchment` → `text-white`
- `text-parchment/70` → `text-white/70`
- `text-parchment/50` → `text-white/50`

---

### Task 7: Final build verification and visual check

**Step 1: Build**

Run: `npm run build`
Expected: Clean build, zero errors.

**Step 2: Visual checklist**

Start dev server: `npm run dev`

Check each view:
- [ ] Landing page: Navy hero, white CTA text, gold feature icons
- [ ] TopBar: White background, thin navy top-stripe, navy text, dome icon visible
- [ ] Sidebar: Light background, navy active pill, cool gray inactive text
- [ ] Services view: Cards/map look correct with cool borders
- [ ] Career Growth: Navy accents instead of crimson
- [ ] News: Category badges still colorful (these are semantic, not brand)
- [ ] Chat bubble: Navy FAB, navy panel header
- [ ] Chat messages: User bubble navy, assistant border navy-tinted
- [ ] Mobile nav: Navy active state

---

## Out of Scope (intentionally not changed)

These use **semantic colors** (category coding) not brand colors — they should stay as-is:
- Service category colors (health=red, education=blue, etc.) in `serviceCategoryMeta.ts`, `ServiceMap.tsx`, `CivicActionCard.tsx`, `PinDetailCard.tsx`, `ServiceGuideCards.tsx`
- News category badges in `NewsCard.tsx`, `NewsDetail.tsx`
- Skill category colors in `TrendingSkillsBar.tsx`, `UpskillingPanel.tsx`
- Job filter chips in `JobFilters.tsx`
- Commute panel map markers in `CommutePanel.tsx`
- Toast destructive state in `toast.tsx`
- Notification badges (`bg-red-500`) in `FloatingChatBubble.tsx`, `MobileNav.tsx`

These are all intentional color-coding that helps users distinguish categories/states. Changing them would hurt usability.
