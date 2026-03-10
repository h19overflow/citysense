# Government-Inspired Redesign

**Date**: 2026-03-06
**Status**: Approved
**Goal**: Shift from startup/civic nonprofit feel to professional government-portal aesthetic, aligned with USWDS patterns while retaining Montgomery identity.

## Design Direction

**Approach**: Government-inspired hybrid — Navy blue primary with local Montgomery identity (gold accents, capitol dome). Professional trust + local warmth.

## Color System

| Token | Current | New | Hex |
|-------|---------|-----|-----|
| `--primary` | Crimson #9B2335 | Navy Blue | `#1a4480` |
| `--primary-foreground` | Parchment | White | `#FFFFFF` |
| `--secondary` | Montgomery Blue #1C3F6E | Dark Navy | `#162e51` |
| `--secondary-foreground` | Parchment | White | `#FFFFFF` |
| `--background` | Parchment #FAF7F2 | Neutral white | `#FAFAFA` |
| `--foreground` | Charcoal #1A1A1A | Dark base | `#1b1b1b` |
| `--accent` | Amber Gold #C8882A | **Kept** | `#C8882A` |
| `--muted` | Warm gray #F1EDE8 | Cool gray | `#F0F0F0` |
| `--muted-foreground` | 40% gray | Cool gray | `#71767a` |
| `--destructive` | Alert Red #C0392B | USWDS Red | `#d83933` |
| `--success` | Pine Green #2D6A4F | **Kept** | `#2D6A4F` |
| `--border` | Warm #E3DDD6 | Cool | `#DFE1E2` |
| `--input` | Warm gray #F1EDE8 | Cool gray | `#F0F0F0` |
| `--ring` | Crimson | Navy Blue | `#1a4480` |
| `--radius` | 1rem (16px) | 0.5rem (8px) | — |

### Montgomery-Specific Tokens (updated)
- `--crimson` → Remove (no longer used as brand color)
- `--montgomery-blue` → `#1a4480`
- `--amber-gold` → `#C8882A` (kept)
- `--parchment` → Remove (using neutral white)
- `--charcoal` → `#1b1b1b`
- `--pine-green` → `#2D6A4F` (kept)

### Sidebar Tokens
- `--sidebar-background` → `#FAFAFA`
- `--sidebar-foreground` → `#1b1b1b`
- `--sidebar-primary` → `#1a4480`
- `--sidebar-primary-foreground` → `#FFFFFF`
- `--sidebar-accent` → `#C8882A`
- `--sidebar-border` → `#DFE1E2`
- `--sidebar-ring` → `#1a4480`

## Component Changes

### TopBar
- Background: **white** with 3px navy (`#1a4480`) top-stripe border
- Text: navy (`#162e51`)
- Subtitle: cool gray
- Capitol dome icon: kept, no brightness filter needed on white bg
- Language toggle: navy pill style

### Sidebar
- Background: `#FAFAFA`
- Active item: navy (`#1a4480`) pill with white text
- Inactive: cool gray (`#71767a`) text
- Collapsed icons: same pattern

### Cards & Buttons
- Border-radius: 8px cards, 6px buttons
- Primary buttons: navy bg, white text
- Card borders: `#DFE1E2`
- Shadows: subtle, cool-toned

### Chat Bubble FAB
- Background: navy (`#1a4480`) instead of crimson
- Keep 16px radius (stays rounded)

### Chat Bubbles (MessageBubble)
- Keep 16px radius for conversational feel
- Assistant bubble border: navy-tinted instead of crimson-tinted

### Landing Page (Splash.tsx)
- Hero: navy background instead of crimson
- CTA section: navy/secondary background
- Feature icons: navy instead of crimson
- Buttons: white on navy

### What Stays
- Layout structure (sidebar + content + context panel)
- Inter font family
- Amber gold accent color
- Capitol dome branding icon
- Magnolia background SVG pattern (keep but adjust opacity)
- All component architecture

## Border Radius Scale
```
--radius:          0.5rem (8px)  — default for cards
Buttons:           6px
Cards:             8px
Chat bubbles:      16px (conversational exception)
Inputs:            6px
Sidebar pills:     6px
Modals/panels:     8px
Chat bubble FAB:   full circle
```

## Files to Modify

1. `src/index.css` — All CSS custom properties, remove warm palette tokens
2. `src/components/app/TopBar.tsx` — White bg, navy stripe, navy text
3. `src/components/app/FlowSidebar.tsx` — Update active/inactive colors if hardcoded
4. `src/components/app/FloatingChatBubble.tsx` — Verify uses theme tokens (should auto-update)
5. `src/pages/Splash.tsx` — Hero/CTA sections use navy instead of crimson
6. `src/components/app/MobileNav.tsx` — Verify uses theme tokens
7. `src/components/app/MessageBubble.tsx` — Check for hardcoded crimson references
8. Any component with hardcoded `bg-primary` or color values that assumed crimson

## References
- [USWDS Theme Color Tokens](https://designsystem.digital.gov/design-tokens/color/theme-tokens/)
- [Inclusive Color Palettes for Government Websites](https://averoadvisors.com/insights/inclusive-color-palettes-for-government-websites/)
