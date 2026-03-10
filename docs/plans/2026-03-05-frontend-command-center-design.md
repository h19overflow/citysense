# Frontend Enhancement: Command Center Design

**Date:** 2026-03-05
**Project:** MontgomeryAI — Montgomery Navigator
**Context:** WWV Hackathon, desktop-first responsive, flow-aware UI

---

## Problem

The current frontend is chat-only: Splash → Onboarding → Chat. This creates two problems:

1. **Outputs get buried** — rich cards (cliff analysis, job cards, PDFs) disappear up the scroll
2. **No overview** — no way to see profile, action items, saved artifacts, or progress at a glance

## Decision

**Approach A: Command Center** — three-column desktop layout (sidebar | chat | context panel) that collapses responsively for tablet/mobile.

---

## 1. Overall Layout

### Desktop (≥1024px)

```
┌───────────────────────────────────────────────────────────────────┐
│  TopBar: MontgomeryAI    [EN|ES]    [🔔]    [👤 Profile]        │
├────────────┬────────────────────────────┬─────────────────────────┤
│  LEFT      │  CENTER                    │  RIGHT                  │
│  SIDEBAR   │  CHAT AREA                 │  CONTEXT PANEL          │
│  (260px)   │  (flex-1, min 400px)       │  (380px)                │
│            │                            │                         │
│  Flow      │  Messages scroll here      │  Active Artifact        │
│  Stepper   │                            │  (full-size card)       │
│            │                            │                         │
│  Quick     │                            │  Profile Summary        │
│  Actions   │                            │  (collapsible)          │
│            │                            │                         │
│  Document  │                            │  Action Items           │
│  Shelf     │                            │  (checklist)            │
│            │  ┌──────────────────────┐  │                         │
│            │  │ Chat Input           │  │                         │
├────────────┴──┴──────────────────────┴──┴─────────────────────────┤
```

### Tablet (768–1023px)

- Left sidebar collapses to icon-only rail (60px), expand on hover/click
- Right panel becomes a slide-over drawer (triggered by clicking artifact in chat)
- Chat stays center

### Mobile (<768px)

- Single column: chat only
- Bottom navigation bar: `[💬 Chat] [📋 Plan] [📁 Docs] [👤 Profile]`
- Each tab shows a full-screen view

### Routes

```
/       → Splash (auto-redirect after 2.8s)
/app    → CommandCenter (main interface)
/*      → NotFound
```

Onboarding is removed as a separate page — replaced by welcome message with quick-start chips in chat.

---

## 2. Left Sidebar

### Flow Progress Stepper

When AI detects which flow the user is in (U1-U6), shows a vertical stepper:

```
┌─ YOUR JOURNEY ──────────────────┐
│  Benefits Cliff Crossroads      │
│                                 │
│  ✅ 1. Describe your situation  │
│  ✅ 2. Benefits impact scan     │
│  ● → 3. Net income calculation  │  ← current (highlighted)
│  ○  4. Transition path          │
│  ○  5. Bridge programs          │
│  ○  6. Follow-up                │
└─────────────────────────────────┘
```

- Steps derived from flow definitions (U1-U6 each have defined phases)
- AI sends `flowMeta` with responses to update stepper
- Clicking completed step scrolls chat to that step's messages

### Quick Action Chips

Contextual actions that change based on active flow and step:

```
┌─ QUICK ACTIONS ─────────────────┐
│  [📊 See cliff analysis]        │
│  [🏥 Check Medicaid options]    │
│  [💼 Find jobs with insurance]  │
│  [📄 Download my plan]          │
└─────────────────────────────────┘
```

Chips inject text into chat input.

### Document Shelf

All generated artifacts, ordered by recency:

```
┌─ YOUR DOCUMENTS ────────────────┐
│  📄 Benefits Cliff Analysis     │
│     Generated 2 min ago         │
│  📄 Benefits Eligibility Card   │
│     Generated 5 min ago         │
└─────────────────────────────────┘
```

- Click to open in right context panel
- Download button on each
- Empty state: "Documents will appear here as we work through your plan"

---

## 3. Right Context Panel

### Active Artifact (top, largest)

Full-size rendering of the most recent rich card. Updates automatically when a new artifact appears in chat. User can also click "Pin to panel" on any card in chat.

```
┌─ ACTIVE INSIGHT ────────────────────┐
│  Benefits Cliff Analysis            │
│  ┌────────────┬──────────┬───────┐  │
│  │            │ Now      │ +Job  │  │
│  │ Take-home  │ $890     │$2,340 │  │
│  │ SNAP       │ $430     │ $0    │  │
│  │ TOTAL      │ $1,920   │$1,930 │  │
│  └────────────┴──────────┴───────┘  │
│  [📥 Download PDF] [📤 Share]       │
└─────────────────────────────────────┘
```

### Profile Summary (collapsible)

```
┌─ YOUR PROFILE ──────────────────────┐
│  📍 Montgomery, AL 36104            │
│  👨‍👩‍👧‍👦 Household: 4 (1 adult, 3 kids) │
│  💰 Income: $890/mo (part-time)     │
│  🏥 Benefits: SNAP, Medicaid        │
│  [Edit Profile]                     │
└─────────────────────────────────────┘
```

Auto-populated as AI extracts profile info from conversation.

### Action Items (collapsible)

```
┌─ THIS WEEK ─────────────────────────┐
│  ☐ Apply for SNAP ($430/mo value)   │
│  ☐ Request DHR childcare review     │
│  ☑ Review benefits cliff analysis   │
│  NEXT MONTH                         │
│  ☐ Start AIDT training program      │
└─────────────────────────────────────┘
```

AI generates action items as part of life plan output. User can check items off (local state). Grouped by timeframe.

---

## 4. Chat Area Enhancements

### Flow Detection Banner

Thin banner at top of chat when flow is active:

```
🏛 Benefits Cliff Crossroads · Step 3 of 6
```

### Compact Cards

Rich cards in chat render in **compact mode** (summary + buttons) since the full version lives in the right panel:

```
┌─ Benefits Cliff Table (compact) ──┐
│ Net change: +$10/mo               │
│ 12-month: +$480/mo                │
│        [📌 View Full →] [📥 PDF]  │
└────────────────────────────────────┘
```

### Onboarding in Chat

Welcome message with quick-start chips replaces separate onboarding page:

```
Welcome to MontgomeryAI. What's on your mind?

[Should I take this job?]
[I just lost my Medicaid]
[I want to earn more]
[I need income but can't lose childcare]
[I just moved to Montgomery]
[I need to rebuild after incarceration]
```

### Processing Indicator

Replaces generic bouncing dots with meaningful status:

```
⟳ Checking benefits eligibility...
⟳ Searching local jobs...
✅ Profile enriched
```

---

## 5. Message Protocol

### Extended ChatMessage Type

```typescript
interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  type: "text" | "benefits-cliff" | "job-card" | "medicaid"
       | "skill-gap" | "reentry" | "pdf-preview"
       | "flow-update" | "profile-update" | "action-items"
  chips?: string[]
  flowMeta?: {
    flowId: "U1" | "U2" | "U3" | "U4" | "U5" | "U6"
    flowName: string
    currentStep: number
    totalSteps: number
    stepName: string
  }
  profileData?: {
    zip?: string
    householdSize?: number
    income?: number
    benefits?: string[]
    children?: number
  }
  actionItems?: {
    timeframe: "this_week" | "this_month" | "3_months"
    label: string
    completed: boolean
  }[]
  processingSteps?: {
    label: string
    status: "pending" | "in_progress" | "completed"
  }[]
}
```

### State Management

React Context + useReducer for shared state:

- **messages** — conversation history
- **activeFlow** — which flow (U1-U6), which step
- **profile** — extracted user data
- **artifacts** — all generated documents
- **activeArtifact** — what's pinned to right panel
- **actionItems** — checklist state
- **language** — EN/ES

---

## 6. Component Architecture

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `CommandCenter.tsx` | `pages/` | Main layout — orchestrates 3 columns |
| `FlowSidebar.tsx` | `components/app/` | Left sidebar container |
| `FlowStepper.tsx` | `components/app/` | Vertical step progress indicator |
| `QuickActions.tsx` | `components/app/` | Contextual action chip list |
| `DocumentShelf.tsx` | `components/app/` | Artifact library list |
| `ContextPanel.tsx` | `components/app/` | Right panel container |
| `ActiveArtifact.tsx` | `components/app/` | Full-size artifact viewer |
| `ProfileSummary.tsx` | `components/app/` | User profile snapshot |
| `ActionItems.tsx` | `components/app/` | Checklist grouped by timeframe |
| `FlowBanner.tsx` | `components/app/` | Thin flow indicator above chat |
| `ProcessingIndicator.tsx` | `components/app/` | Multi-step typing indicator |
| `AppProvider.tsx` | `components/app/` | React Context for shared state |
| `MobileNav.tsx` | `components/app/` | Bottom tab bar for <768px |

### Modified Components

| Component | Changes |
|-----------|---------|
| `MessageBubble.tsx` | Add "Pin to panel" button, compact card mode |
| `TopBar.tsx` | Add notification bell, profile button |
| `Chat.tsx` | Extract message logic to context, simplify to presentation |
| All card components | Add compact/full render modes |

### Removed

| Component | Replacement |
|-----------|-------------|
| `Onboarding.tsx` | Welcome message in chat |
| `Index.tsx` | CommandCenter is main entry |

---

## 7. Flow Definitions (for Stepper)

Each flow maps to a step sequence:

| Flow | Steps |
|------|-------|
| U1: Benefits Cliff | 1. Situation → 2. Benefits scan → 3. Net income calc → 4. Transition path → 5. Bridge programs → 6. Follow-up |
| U2: Medicaid Loss | 1. Coverage loss → 2. Emergency coverage → 3. Re-enrollment → 4. Jobs w/ insurance → 5. Coverage roadmap → 6. Downloads |
| U3: Assembly Line | 1. Career statement → 2. Skill gap → 3. Training funding → 4. Childcare bridge → 5. 12-month plan → 6. Downloads |
| U4: Single Parent | 1. Situation → 2. Benefits inventory → 3. Cliff-safe jobs → 4. Cliff table → 5. Childcare strategy → 6. Downloads |
| U5: New to Montgomery | 1. Orientation → 2. Dual discovery → 3. Priority actions → 4. Ongoing nav → 5. Downloads |
| U6: Returning Citizen | 1. Reentry statement → 2. AL eligibility → 3. Certificate of Relief → 4. Reentry jobs → 5. First 30 days → 6. Downloads |
