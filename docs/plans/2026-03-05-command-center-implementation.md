# Command Center Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the chat-only Montgomery Navigator into a three-column Command Center layout with flow-aware sidebar, persistent artifact panel, and responsive mobile fallback.

**Architecture:** Desktop-first three-column layout (260px sidebar | flex chat | 380px context panel) built with React Context for shared state. The existing chat, cards, and demo response system are preserved — we wrap them in a new layout shell and extend the message protocol with flow/profile/action metadata. Mobile collapses to single-column with bottom tab navigation.

**Tech Stack:** React 18 + TypeScript, React Router v6, Tailwind CSS 3.4, Radix UI/shadcn, existing Vite build

---

## Task 1: Create App State Context (AppProvider)

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/appContext.tsx`

**Step 1: Create shared types file**

Create `src/lib/types.ts` with the extended message types and app state interfaces. This centralizes all type definitions that were previously only in `demoResponses.ts`.

```typescript
// src/lib/types.ts

export type FlowId = "U1" | "U2" | "U3" | "U4" | "U5" | "U6";
export type Language = "EN" | "ES";
export type MessageType =
  | "text"
  | "benefits-cliff"
  | "job-card"
  | "medicaid"
  | "skill-gap"
  | "reentry"
  | "pdf-preview";

export interface FlowMeta {
  flowId: FlowId;
  flowName: string;
  currentStep: number;
  totalSteps: number;
  stepName: string;
}

export interface ProfileData {
  zip?: string;
  householdSize?: number;
  income?: number;
  benefits?: string[];
  children?: number;
}

export interface ActionItem {
  id: string;
  timeframe: "this_week" | "this_month" | "3_months";
  label: string;
  completed: boolean;
}

export interface ProcessingStep {
  label: string;
  status: "pending" | "in_progress" | "completed";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  type: MessageType;
  chips?: string[];
  flowMeta?: FlowMeta;
  profileData?: ProfileData;
  actionItems?: ActionItem[];
  processingSteps?: ProcessingStep[];
}

export interface Artifact {
  id: string;
  type: "A1" | "A2" | "A3" | "A4";
  title: string;
  messageId: string;
  createdAt: Date;
}

export interface AppState {
  messages: ChatMessage[];
  language: Language;
  activeFlow: FlowMeta | null;
  profile: ProfileData;
  artifacts: Artifact[];
  activeArtifactId: string | null;
  actionItems: ActionItem[];
  isTyping: boolean;
  processingSteps: ProcessingStep[];
}
```

**Step 2: Create AppProvider with useReducer**

Create `src/lib/appContext.tsx` — the React Context that holds all shared state and provides dispatch actions.

```typescript
// src/lib/appContext.tsx
import { createContext, useContext, useReducer, type ReactNode } from "react";
import type {
  AppState,
  ChatMessage,
  FlowMeta,
  ProfileData,
  ActionItem,
  Artifact,
  Language,
  ProcessingStep,
} from "./types";

type AppAction =
  | { type: "ADD_MESSAGE"; message: ChatMessage }
  | { type: "SET_LANGUAGE"; language: Language }
  | { type: "SET_FLOW"; flow: FlowMeta | null }
  | { type: "UPDATE_PROFILE"; data: Partial<ProfileData> }
  | { type: "ADD_ARTIFACT"; artifact: Artifact }
  | { type: "SET_ACTIVE_ARTIFACT"; id: string | null }
  | { type: "SET_ACTION_ITEMS"; items: ActionItem[] }
  | { type: "TOGGLE_ACTION_ITEM"; id: string }
  | { type: "SET_TYPING"; isTyping: boolean }
  | { type: "SET_PROCESSING_STEPS"; steps: ProcessingStep[] };

const initialState: AppState = {
  messages: [],
  language: "EN",
  activeFlow: null,
  profile: {},
  artifacts: [],
  activeArtifactId: null,
  actionItems: [],
  isTyping: false,
  processingSteps: [],
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "ADD_MESSAGE": {
      const msg = action.message;
      let newState = { ...state, messages: [...state.messages, msg] };
      if (msg.flowMeta) newState.activeFlow = msg.flowMeta;
      if (msg.profileData) {
        newState.profile = { ...state.profile, ...msg.profileData };
      }
      if (msg.actionItems) newState.actionItems = msg.actionItems;
      return newState;
    }
    case "SET_LANGUAGE":
      return { ...state, language: action.language };
    case "SET_FLOW":
      return { ...state, activeFlow: action.flow };
    case "UPDATE_PROFILE":
      return { ...state, profile: { ...state.profile, ...action.data } };
    case "ADD_ARTIFACT":
      return { ...state, artifacts: [...state.artifacts, action.artifact] };
    case "SET_ACTIVE_ARTIFACT":
      return { ...state, activeArtifactId: action.id };
    case "SET_ACTION_ITEMS":
      return { ...state, actionItems: action.items };
    case "TOGGLE_ACTION_ITEM":
      return {
        ...state,
        actionItems: state.actionItems.map((item) =>
          item.id === action.id
            ? { ...item, completed: !item.completed }
            : item
        ),
      };
    case "SET_TYPING":
      return { ...state, isTyping: action.isTyping };
    case "SET_PROCESSING_STEPS":
      return { ...state, processingSteps: action.steps };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
```

**Step 3: Run the dev server to verify no build errors**

Run: `cd montgomery-navigator && npm run build:dev`
Expected: Build succeeds (new files are not yet imported anywhere)

**Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/appContext.tsx
git commit -m "feat(state): add AppProvider context and extended message types"
```

---

## Task 2: Update Demo Responses to Use Extended Types

**Files:**
- Modify: `src/lib/demoResponses.ts` (152 lines)

**Step 1: Update demoResponses.ts to use shared types and add flow/profile/action metadata**

Replace the local `ChatMessage` interface with the import from `types.ts`. Add `flowMeta`, `profileData`, and `actionItems` to each demo response so the new UI components have data to render.

Key changes:
- Line 1-7: Remove local `ChatMessage` interface, replace with import from `./types`
- Each response object: add `flowMeta` matching the flow (U1-U6), `profileData` when relevant, `actionItems` when relevant

```typescript
// src/lib/demoResponses.ts
import type { ChatMessage, ActionItem } from "./types";

// Re-export for backward compat
export type { ChatMessage };

export function getDemoResponse(userMessage: string): ChatMessage {
  const lower = userMessage.toLowerCase();

  // U1: Benefits Cliff Crossroads
  if (lower.includes("job") || lower.includes("amazon") || lower.includes("take") || lower.includes("offer")) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "Let me analyze the benefits impact of this job offer for you.",
      type: "benefits-cliff",
      chips: ["What bridge programs help?", "Tell me more about QMB", "Show me other jobs"],
      flowMeta: {
        flowId: "U1",
        flowName: "Benefits Cliff Crossroads",
        currentStep: 3,
        totalSteps: 6,
        stepName: "Net income calculation",
      },
      profileData: {
        income: 890,
        benefits: ["SNAP", "Medicaid", "LIHEAP"],
        children: 3,
        householdSize: 4,
        zip: "36104",
      },
      actionItems: [
        { id: "1", timeframe: "this_week", label: "Review benefits cliff analysis", completed: false },
        { id: "2", timeframe: "this_week", label: "Ask employer about health insurance start date", completed: false },
        { id: "3", timeframe: "this_month", label: "Apply for transitional SNAP", completed: false },
        { id: "4", timeframe: "this_month", label: "File CHIP application for children", completed: false },
      ],
    };
  }

  // U2: Medicaid Loss + Career Reset
  if (lower.includes("medicaid") || lower.includes("coverage") || lower.includes("lost my")) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "I understand this is urgent. Let me find your coverage options and jobs with employer health insurance.",
      type: "medicaid",
      chips: ["Help me re-enroll", "Find jobs with insurance", "What is QMB?"],
      flowMeta: {
        flowId: "U2",
        flowName: "Medicaid Loss + Career Reset",
        currentStep: 2,
        totalSteps: 6,
        stepName: "Emergency coverage scan",
      },
      profileData: {
        benefits: ["Medicaid (lost)"],
        zip: "36104",
      },
      actionItems: [
        { id: "1", timeframe: "this_week", label: "File for CHIP for your children", completed: false },
        { id: "2", timeframe: "this_week", label: "Apply for QMB (Medicare Savings)", completed: false },
        { id: "3", timeframe: "this_month", label: "Apply to 3 jobs with health insurance", completed: false },
      ],
    };
  }

  // U3: Assembly Line Ladder
  if (lower.includes("plant") || lower.includes("earn more") || lower.includes("career") || lower.includes("promotion") || lower.includes("raise")) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "Let me map your skills to higher-paying roles in Montgomery's manufacturing sector.",
      type: "skill-gap",
      chips: ["Tell me about AIDT programs", "How do I keep my childcare subsidy?", "Show me the wage math"],
      flowMeta: {
        flowId: "U3",
        flowName: "Assembly Line Ladder",
        currentStep: 2,
        totalSteps: 6,
        stepName: "Skill gap analysis",
      },
      profileData: {
        income: 1250,
        zip: "36104",
      },
      actionItems: [
        { id: "1", timeframe: "this_week", label: "Register for AIDT orientation", completed: false },
        { id: "2", timeframe: "this_month", label: "Enroll in Quality Control certification", completed: false },
        { id: "3", timeframe: "3_months", label: "Apply for Line Lead positions", completed: false },
      ],
    };
  }

  // U6: Returning Citizen Reentry
  if (lower.includes("reentry") || lower.includes("record") || lower.includes("conviction") || lower.includes("got out") || lower.includes("rebuild") || lower.includes("incarceration")) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "Welcome back to Montgomery. Let me help you with your first 30 days — benefits, jobs, and the Certificate of Relief.",
      type: "reentry",
      chips: ["What's the Certificate of Relief?", "Who hires with a record?", "Can I get SNAP?"],
      flowMeta: {
        flowId: "U6",
        flowName: "Returning Citizen Reentry",
        currentStep: 2,
        totalSteps: 6,
        stepName: "Alabama-specific eligibility",
      },
      actionItems: [
        { id: "1", timeframe: "this_week", label: "Apply for Medicaid (you qualify)", completed: false },
        { id: "2", timeframe: "this_week", label: "Attend AIDT construction trades orientation", completed: false },
        { id: "3", timeframe: "this_month", label: "Apply to 3 fair-chance employers", completed: false },
        { id: "4", timeframe: "this_month", label: "File Certificate of Relief petition", completed: false },
      ],
    };
  }

  // U5: Benefits discovery / New to Montgomery
  if (lower.includes("benefits") || lower.includes("qualify") || lower.includes("eligible") || lower.includes("snap")) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "Based on your profile, here are the programs you likely qualify for in Montgomery.",
      type: "pdf-preview",
      chips: ["How do I apply for SNAP?", "What documents do I need?", "Are there other programs?"],
      flowMeta: {
        flowId: "U5",
        flowName: "New to Montgomery",
        currentStep: 2,
        totalSteps: 5,
        stepName: "Benefits discovery scan",
      },
      profileData: {
        benefits: ["SNAP (eligible)", "Medicaid (eligible)", "LIHEAP (eligible)"],
        zip: "36104",
      },
      actionItems: [
        { id: "1", timeframe: "this_week", label: "Apply for SNAP ($430/mo est. value)", completed: false },
        { id: "2", timeframe: "this_week", label: "Verify Medicaid eligibility at DHR", completed: false },
        { id: "3", timeframe: "this_month", label: "Register with AlabamaWorks", completed: false },
      ],
    };
  }

  // U4: Single Parent Financial Reset
  if (lower.includes("single") || lower.includes("parent") || lower.includes("childcare") || lower.includes("kids")) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "Let me find jobs that won't trigger the childcare cliff, and show you the net income math for each option.",
      type: "job-card",
      chips: ["Show me the benefits cliff for this job", "What about childcare subsidies?", "Find part-time options"],
      flowMeta: {
        flowId: "U4",
        flowName: "Single Parent Financial Reset",
        currentStep: 3,
        totalSteps: 6,
        stepName: "Cliff-safe job search",
      },
      profileData: {
        children: 3,
        householdSize: 4,
        benefits: ["SNAP", "Medicaid", "DHR Childcare"],
        income: 890,
      },
      actionItems: [
        { id: "1", timeframe: "this_week", label: "Review job options with cliff analysis", completed: false },
        { id: "2", timeframe: "this_week", label: "Request DHR childcare tier review", completed: false },
        { id: "3", timeframe: "this_month", label: "Apply to top cliff-safe employer", completed: false },
      ],
    };
  }

  // Form guide responses
  if (lower.includes("apply") || lower.includes("form") || lower.includes("document")) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "Here's exactly what you need to bring to the DHR office:\n\n1. Photo ID (driver's license or state ID)\n2. Last 30 days of pay stubs\n3. Proof of address (utility bill or lease)\n4. Social Security cards for all household members\n5. Birth certificates for children under 18\n\nThe Montgomery DHR office is at 770 S McDonough St. Open Mon–Fri 8am–4:30pm. Call (334) 293-3100 to confirm.",
      type: "text",
      chips: ["What if I'm missing a document?", "Can I apply online?", "How long does it take?"],
    };
  }

  // New to Montgomery
  if (lower.includes("moved") || lower.includes("new here") || lower.includes("new to")) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "Welcome to Montgomery! Let me help you get oriented. Here are your first 5 priorities:\n\n1. Check your benefits eligibility — you may qualify for SNAP, Medicaid, and utility assistance\n2. Register with AlabamaWorks at the Montgomery Career Center (1060 E South Blvd)\n3. Get familiar with MATA bus routes if you need transit (matransit.com)\n4. Your ZIP code gives you access to specific city recreation programs\n5. 211 is your shortcut to any community resource — call or text anytime\n\nWhat's your most pressing need right now?",
      type: "text",
      chips: ["What benefits do I qualify for?", "Find jobs near me", "I need help with housing"],
      flowMeta: {
        flowId: "U5",
        flowName: "New to Montgomery",
        currentStep: 1,
        totalSteps: 5,
        stepName: "Geographic orientation",
      },
    };
  }

  // Bridge programs
  if (lower.includes("bridge") || lower.includes("transition")) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "Good thinking — bridge programs can smooth the income transition:\n\n• Transitional SNAP: You keep SNAP for 5 months after income increases, even if you'd normally lose it. Apply at DHR.\n• CHIP: Your children stay covered regardless of your income change. Separate from adult Medicaid.\n• DHR Childcare Transition: Request a 'tier review' — your subsidy adjusts gradually, not all at once.\n• LIHEAP: Apply before your income changes — once approved, it lasts the full heating/cooling season.",
      type: "text",
      chips: ["Help me apply for transitional SNAP", "How does CHIP work?", "What's the DHR number?"],
    };
  }

  // Default
  return {
    id: Date.now().toString(),
    role: "assistant",
    content: "I can help you navigate benefits, jobs, and resources in Montgomery. What's your situation?\n\nI specialize in:\n• Benefits cliff analysis — will a new job make you poorer?\n• Medicaid and healthcare coverage\n• Career advancement paths in Montgomery\n• Childcare and single parent resources\n• Reentry guidance for returning citizens\n• New resident orientation",
    type: "text",
    chips: [
      "Should I take this job offer?",
      "I just lost my Medicaid",
      "I want to earn more",
      "I need income but can't lose childcare",
      "I just moved to Montgomery",
      "I need to rebuild after incarceration",
    ],
  };
}
```

**Step 2: Verify build**

Run: `cd montgomery-navigator && npm run build:dev`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/demoResponses.ts
git commit -m "feat(responses): add flow metadata, profile data, and action items to demo responses"
```

---

## Task 3: Build Flow Definitions

**Files:**
- Create: `src/lib/flowDefinitions.ts`

**Step 1: Create flow definitions with step labels for each U1-U6 flow**

```typescript
// src/lib/flowDefinitions.ts
import type { FlowId } from "./types";

export interface FlowStep {
  step: number;
  label: string;
}

export interface FlowDefinition {
  id: FlowId;
  name: string;
  icon: string;
  steps: FlowStep[];
}

export const FLOW_DEFINITIONS: Record<FlowId, FlowDefinition> = {
  U1: {
    id: "U1",
    name: "Benefits Cliff Crossroads",
    icon: "📊",
    steps: [
      { step: 1, label: "Describe your situation" },
      { step: 2, label: "Benefits impact scan" },
      { step: 3, label: "Net income calculation" },
      { step: 4, label: "Transition path" },
      { step: 5, label: "Bridge programs" },
      { step: 6, label: "Follow-up" },
    ],
  },
  U2: {
    id: "U2",
    name: "Medicaid Loss + Career Reset",
    icon: "🏥",
    steps: [
      { step: 1, label: "Coverage loss statement" },
      { step: 2, label: "Emergency coverage scan" },
      { step: 3, label: "Re-enrollment check" },
      { step: 4, label: "Jobs with insurance" },
      { step: 5, label: "Coverage roadmap" },
      { step: 6, label: "Downloads" },
    ],
  },
  U3: {
    id: "U3",
    name: "Assembly Line Ladder",
    icon: "🏭",
    steps: [
      { step: 1, label: "Career statement" },
      { step: 2, label: "Skill gap analysis" },
      { step: 3, label: "Training funding" },
      { step: 4, label: "Childcare bridge" },
      { step: 5, label: "12-month career plan" },
      { step: 6, label: "Downloads" },
    ],
  },
  U4: {
    id: "U4",
    name: "Single Parent Financial Reset",
    icon: "👨‍👩‍👧‍👦",
    steps: [
      { step: 1, label: "Describe your situation" },
      { step: 2, label: "Benefits inventory" },
      { step: 3, label: "Cliff-safe job search" },
      { step: 4, label: "Benefits cliff table" },
      { step: 5, label: "Childcare strategy" },
      { step: 6, label: "Downloads" },
    ],
  },
  U5: {
    id: "U5",
    name: "New to Montgomery",
    icon: "📍",
    steps: [
      { step: 1, label: "Geographic orientation" },
      { step: 2, label: "Benefits discovery scan" },
      { step: 3, label: "Priority action list" },
      { step: 4, label: "Ongoing navigation" },
      { step: 5, label: "Downloads" },
    ],
  },
  U6: {
    id: "U6",
    name: "Returning Citizen Reentry",
    icon: "🔓",
    steps: [
      { step: 1, label: "Reentry statement" },
      { step: 2, label: "Alabama-specific eligibility" },
      { step: 3, label: "Certificate of Relief" },
      { step: 4, label: "Reentry-aware jobs" },
      { step: 5, label: "First 30 days plan" },
      { step: 6, label: "Downloads" },
    ],
  },
};
```

**Step 2: Verify build**

Run: `cd montgomery-navigator && npm run build:dev`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/flowDefinitions.ts
git commit -m "feat(flows): add U1-U6 flow step definitions"
```

---

## Task 4: Build Left Sidebar Components

**Files:**
- Create: `src/components/app/FlowStepper.tsx`
- Create: `src/components/app/QuickActions.tsx`
- Create: `src/components/app/DocumentShelf.tsx`
- Create: `src/components/app/FlowSidebar.tsx`

**Step 1: Create FlowStepper component**

Vertical step indicator that shows flow progress. Reads from AppContext.

```typescript
// src/components/app/FlowStepper.tsx
import { useApp } from "@/lib/appContext";
import { FLOW_DEFINITIONS } from "@/lib/flowDefinitions";

export default function FlowStepper() {
  const { state } = useApp();
  const { activeFlow } = state;

  if (!activeFlow) {
    return (
      <div className="px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Start a conversation to see your journey.
        </p>
      </div>
    );
  }

  const flowDef = FLOW_DEFINITIONS[activeFlow.flowId];
  if (!flowDef) return null;

  return (
    <div className="px-4 py-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        Your Journey
      </p>
      <p className="text-sm font-semibold text-foreground mb-3">
        {flowDef.icon} {flowDef.name}
      </p>
      <ol className="space-y-2">
        {flowDef.steps.map((step) => {
          const isCompleted = step.step < activeFlow.currentStep;
          const isCurrent = step.step === activeFlow.currentStep;
          const isFuture = step.step > activeFlow.currentStep;

          return (
            <li key={step.step} className="flex items-start gap-2">
              <span className="mt-0.5 flex-shrink-0">
                {isCompleted && (
                  <span className="text-success text-sm">✓</span>
                )}
                {isCurrent && (
                  <span className="inline-block w-2 h-2 mt-1 rounded-full bg-primary" />
                )}
                {isFuture && (
                  <span className="inline-block w-2 h-2 mt-1 rounded-full border border-muted-foreground/30" />
                )}
              </span>
              <span
                className={`text-sm leading-tight ${
                  isCompleted
                    ? "text-muted-foreground line-through"
                    : isCurrent
                    ? "text-foreground font-medium"
                    : "text-muted-foreground/50"
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
```

**Step 2: Create QuickActions component**

Contextual action chips that change based on the active flow.

```typescript
// src/components/app/QuickActions.tsx
import { useApp } from "@/lib/appContext";
import type { FlowId } from "@/lib/types";

const FLOW_ACTIONS: Record<FlowId, string[]> = {
  U1: ["See cliff analysis", "Check Medicaid impact", "Find bridge programs", "Download my plan"],
  U2: ["Find jobs with insurance", "Help me re-enroll", "Check CHIP for kids", "Emergency coverage"],
  U3: ["Show training programs", "Check WIOA funding", "Childcare during training", "See wage math"],
  U4: ["Compare job options", "Check childcare subsidy", "Find flexible jobs", "DHR tier review"],
  U5: ["What do I qualify for?", "Find jobs near me", "Transit options", "Community resources"],
  U6: ["Certificate of Relief", "Who hires with records?", "Check Medicaid", "AIDT programs"],
};

const DEFAULT_ACTIONS = [
  "Should I take this job?",
  "I lost my Medicaid",
  "I want to earn more",
  "What do I qualify for?",
];

interface QuickActionsProps {
  onAction: (text: string) => void;
}

export default function QuickActions({ onAction }: QuickActionsProps) {
  const { state } = useApp();
  const actions = state.activeFlow
    ? FLOW_ACTIONS[state.activeFlow.flowId]
    : DEFAULT_ACTIONS;

  return (
    <div className="px-4 py-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Quick Actions
      </p>
      <div className="flex flex-col gap-1.5">
        {actions.map((action) => (
          <button
            key={action}
            onClick={() => onAction(action)}
            className="text-left text-sm px-3 py-1.5 rounded-md border border-border/50 hover:bg-accent/10 hover:border-primary/30 transition-colors truncate"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Create DocumentShelf component**

Lists all generated artifacts with click-to-view and download.

```typescript
// src/components/app/DocumentShelf.tsx
import { FileText, Download } from "lucide-react";
import { useApp } from "@/lib/appContext";

export default function DocumentShelf() {
  const { state, dispatch } = useApp();
  const { artifacts, activeArtifactId } = state;

  if (artifacts.length === 0) {
    return (
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Your Documents
        </p>
        <p className="text-xs text-muted-foreground/60">
          Documents will appear here as we work through your plan.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Your Documents ({artifacts.length})
      </p>
      <div className="flex flex-col gap-1.5">
        {artifacts.map((artifact) => (
          <button
            key={artifact.id}
            onClick={() => dispatch({ type: "SET_ACTIVE_ARTIFACT", id: artifact.id })}
            className={`flex items-center gap-2 text-left px-3 py-2 rounded-md border transition-colors ${
              activeArtifactId === artifact.id
                ? "border-primary/50 bg-primary/5"
                : "border-border/50 hover:bg-accent/10"
            }`}
          >
            <FileText className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{artifact.title}</p>
              <p className="text-xs text-muted-foreground">
                {formatTimeAgo(artifact.createdAt)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
```

**Step 4: Create FlowSidebar container**

Wraps the three sidebar sections with dividers and scroll.

```typescript
// src/components/app/FlowSidebar.tsx
import FlowStepper from "./FlowStepper";
import QuickActions from "./QuickActions";
import DocumentShelf from "./DocumentShelf";

interface FlowSidebarProps {
  onQuickAction: (text: string) => void;
}

export default function FlowSidebar({ onQuickAction }: FlowSidebarProps) {
  return (
    <aside className="w-[260px] flex-shrink-0 border-r border-border/50 bg-sidebar flex flex-col overflow-y-auto">
      <FlowStepper />
      <hr className="border-border/30 mx-4" />
      <QuickActions onAction={onQuickAction} />
      <hr className="border-border/30 mx-4" />
      <DocumentShelf />
    </aside>
  );
}
```

**Step 5: Verify build**

Run: `cd montgomery-navigator && npm run build:dev`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/components/app/FlowStepper.tsx src/components/app/QuickActions.tsx src/components/app/DocumentShelf.tsx src/components/app/FlowSidebar.tsx
git commit -m "feat(sidebar): add flow stepper, quick actions, and document shelf"
```

---

## Task 5: Build Right Context Panel Components

**Files:**
- Create: `src/components/app/ActiveArtifact.tsx`
- Create: `src/components/app/ProfileSummary.tsx`
- Create: `src/components/app/ActionItems.tsx`
- Create: `src/components/app/ContextPanel.tsx`

**Step 1: Create ActiveArtifact component**

Renders the full-size version of the most recently pinned card. Uses the same card components but in "full" mode.

```typescript
// src/components/app/ActiveArtifact.tsx
import { useApp } from "@/lib/appContext";
import BenefitsCliffCard from "./cards/BenefitsCliffCard";
import JobCard from "./cards/JobCard";
import MedicaidCard from "./cards/MedicaidCard";
import SkillGapCard from "./cards/SkillGapCard";
import ReentryCard from "./cards/ReentryCard";
import PdfPreviewCard from "./cards/PdfPreviewCard";
import type { ChatMessage } from "@/lib/types";

const CARD_COMPONENTS: Record<string, React.ComponentType> = {
  "benefits-cliff": BenefitsCliffCard,
  "job-card": JobCard,
  medicaid: MedicaidCard,
  "skill-gap": SkillGapCard,
  reentry: ReentryCard,
  "pdf-preview": PdfPreviewCard,
};

export default function ActiveArtifact() {
  const { state } = useApp();

  // Find the last message with a card type
  const lastCardMessage = [...state.messages]
    .reverse()
    .find(
      (msg) =>
        msg.role === "assistant" && msg.type !== "text"
    );

  if (!lastCardMessage) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          Insights will appear here as we explore your options.
        </p>
      </div>
    );
  }

  const CardComponent = CARD_COMPONENTS[lastCardMessage.type];
  if (!CardComponent) return null;

  return (
    <div className="px-4 py-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Active Insight
      </p>
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <CardComponent />
      </div>
    </div>
  );
}
```

**Step 2: Create ProfileSummary component**

Displays extracted user profile data from context.

```typescript
// src/components/app/ProfileSummary.tsx
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/lib/appContext";

export default function ProfileSummary() {
  const { state } = useApp();
  const { profile } = state;
  const [expanded, setExpanded] = useState(true);

  const hasData = profile.zip || profile.income || profile.children !== undefined;

  if (!hasData) {
    return (
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Your Profile
        </p>
        <p className="text-xs text-muted-foreground/60">
          Tell me about your situation and I'll remember the details.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full mb-2"
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Your Profile
        </p>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="space-y-1.5 text-sm">
          {profile.zip && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Location:</span>
              <span>Montgomery, AL {profile.zip}</span>
            </div>
          )}
          {profile.householdSize && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Household:</span>
              <span>
                {profile.householdSize} people
                {profile.children ? ` (${profile.children} children)` : ""}
              </span>
            </div>
          )}
          {profile.income !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Income:</span>
              <span>${profile.income.toLocaleString()}/mo</span>
            </div>
          )}
          {profile.benefits && profile.benefits.length > 0 && (
            <div>
              <span className="text-muted-foreground">Benefits:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {profile.benefits.map((b) => (
                  <span
                    key={b}
                    className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Create ActionItems component**

Grouped checklist that renders action items from context.

```typescript
// src/components/app/ActionItems.tsx
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/lib/appContext";

const TIMEFRAME_LABELS: Record<string, string> = {
  this_week: "This Week",
  this_month: "This Month",
  "3_months": "Next 3 Months",
};

const TIMEFRAME_ORDER = ["this_week", "this_month", "3_months"];

export default function ActionItems() {
  const { state, dispatch } = useApp();
  const { actionItems } = state;
  const [expanded, setExpanded] = useState(true);

  if (actionItems.length === 0) {
    return (
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Action Items
        </p>
        <p className="text-xs text-muted-foreground/60">
          Your to-do list will build as we create your plan.
        </p>
      </div>
    );
  }

  const grouped = TIMEFRAME_ORDER.reduce<Record<string, typeof actionItems>>(
    (acc, tf) => {
      const items = actionItems.filter((item) => item.timeframe === tf);
      if (items.length > 0) acc[tf] = items;
      return acc;
    },
    {}
  );

  const completedCount = actionItems.filter((i) => i.completed).length;

  return (
    <div className="px-4 py-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full mb-2"
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Action Items ({completedCount}/{actionItems.length})
        </p>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="space-y-3">
          {Object.entries(grouped).map(([timeframe, items]) => (
            <div key={timeframe}>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {TIMEFRAME_LABELS[timeframe]}
              </p>
              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start gap-2">
                    <button
                      onClick={() =>
                        dispatch({ type: "TOGGLE_ACTION_ITEM", id: item.id })
                      }
                      className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border transition-colors ${
                        item.completed
                          ? "bg-success border-success text-white"
                          : "border-muted-foreground/30 hover:border-primary"
                      }`}
                    >
                      {item.completed && (
                        <span className="text-[10px] flex items-center justify-center">
                          ✓
                        </span>
                      )}
                    </button>
                    <span
                      className={`text-sm leading-tight ${
                        item.completed
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 4: Create ContextPanel container**

Wraps ActiveArtifact, ProfileSummary, and ActionItems.

```typescript
// src/components/app/ContextPanel.tsx
import ActiveArtifact from "./ActiveArtifact";
import ProfileSummary from "./ProfileSummary";
import ActionItems from "./ActionItems";

export default function ContextPanel() {
  return (
    <aside className="w-[380px] flex-shrink-0 border-l border-border/50 bg-background flex flex-col overflow-y-auto">
      <ActiveArtifact />
      <hr className="border-border/30 mx-4" />
      <ProfileSummary />
      <hr className="border-border/30 mx-4" />
      <ActionItems />
    </aside>
  );
}
```

**Step 5: Verify build**

Run: `cd montgomery-navigator && npm run build:dev`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/components/app/ActiveArtifact.tsx src/components/app/ProfileSummary.tsx src/components/app/ActionItems.tsx src/components/app/ContextPanel.tsx
git commit -m "feat(panel): add active artifact, profile summary, action items, and context panel"
```

---

## Task 6: Build Chat Enhancements

**Files:**
- Create: `src/components/app/FlowBanner.tsx`
- Create: `src/components/app/ProcessingIndicator.tsx`
- Modify: `src/components/app/MessageBubble.tsx` (68 lines)

**Step 1: Create FlowBanner component**

Thin banner at top of chat showing current flow and step.

```typescript
// src/components/app/FlowBanner.tsx
import { useApp } from "@/lib/appContext";
import { FLOW_DEFINITIONS } from "@/lib/flowDefinitions";

export default function FlowBanner() {
  const { state } = useApp();
  const { activeFlow } = state;

  if (!activeFlow) return null;

  const flowDef = FLOW_DEFINITIONS[activeFlow.flowId];
  if (!flowDef) return null;

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-primary/5 border-b border-primary/10 text-sm">
      <span>{flowDef.icon}</span>
      <span className="font-medium text-foreground">{flowDef.name}</span>
      <span className="text-muted-foreground">
        · Step {activeFlow.currentStep} of {activeFlow.totalSteps}
      </span>
    </div>
  );
}
```

**Step 2: Create ProcessingIndicator component**

Multi-step progress indicator replacing generic typing dots.

```typescript
// src/components/app/ProcessingIndicator.tsx
import { useApp } from "@/lib/appContext";
import yellowhammer from "@/assets/yellowhammer.png";

export default function ProcessingIndicator() {
  const { state } = useApp();
  const { isTyping, processingSteps } = state;

  if (!isTyping) return null;

  // Show detailed steps if available, otherwise generic indicator
  if (processingSteps.length > 0) {
    return (
      <div className="flex items-start gap-2 px-4 py-2">
        <img
          src={yellowhammer}
          alt="AI"
          className="w-7 h-7 rounded-full mt-0.5"
        />
        <div className="bg-white border border-secondary/10 rounded-xl px-4 py-2.5 space-y-1">
          {processingSteps.map((step, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              {step.status === "completed" && (
                <span className="text-success">✓</span>
              )}
              {step.status === "in_progress" && (
                <span className="inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
              {step.status === "pending" && (
                <span className="inline-block w-3 h-3 rounded-full border border-muted-foreground/30" />
              )}
              <span
                className={
                  step.status === "completed"
                    ? "text-muted-foreground"
                    : "text-foreground"
                }
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Fallback: generic typing dots
  return (
    <div className="flex items-start gap-2 px-4 py-2">
      <img
        src={yellowhammer}
        alt="AI"
        className="w-7 h-7 rounded-full mt-0.5"
      />
      <div className="bg-white border border-secondary/10 rounded-xl px-4 py-3 flex gap-1.5">
        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.15s]" />
        <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.3s]" />
      </div>
    </div>
  );
}
```

**Step 3: Update MessageBubble to add "View Full" pin button on card messages**

Modify `src/components/app/MessageBubble.tsx` — add a "View Full →" button below each card that dispatches to the context panel. Also import the new types.

Replace the entire file with the updated version that:
- Uses the shared ChatMessage type from `@/lib/types`
- Adds "View Full →" button on all card-type messages
- Keeps existing card rendering and chip functionality

```typescript
// src/components/app/MessageBubble.tsx
import yellowhammer from "@/assets/yellowhammer.png";
import type { ChatMessage } from "@/lib/types";
import BenefitsCliffCard from "./cards/BenefitsCliffCard";
import JobCard from "./cards/JobCard";
import MedicaidCard from "./cards/MedicaidCard";
import SkillGapCard from "./cards/SkillGapCard";
import ReentryCard from "./cards/ReentryCard";
import PdfPreviewCard from "./cards/PdfPreviewCard";
import { Eye } from "lucide-react";

interface MessageBubbleProps {
  message: ChatMessage;
  onChipClick?: (text: string) => void;
}

const CARD_COMPONENTS: Record<string, React.ComponentType> = {
  "benefits-cliff": BenefitsCliffCard,
  "job-card": JobCard,
  medicaid: MedicaidCard,
  "skill-gap": SkillGapCard,
  reentry: ReentryCard,
  "pdf-preview": PdfPreviewCard,
};

export default function MessageBubble({ message, onChipClick }: MessageBubbleProps) {
  const CardComponent = CARD_COMPONENTS[message.type];
  const hasCard = message.role === "assistant" && CardComponent;

  if (message.role === "user") {
    return (
      <div className="flex justify-end px-4 py-1">
        <div className="bg-primary text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[80%] text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-1">
      <div className="flex items-start gap-2">
        <img src={yellowhammer} alt="AI" className="w-7 h-7 rounded-full mt-1" />
        <div className="flex-1 min-w-0">
          <div className="bg-white border-l-2 border-secondary/20 rounded-xl rounded-tl-sm px-4 py-2.5 max-w-full">
            {message.content && (
              <p className="text-sm text-foreground whitespace-pre-line mb-2">
                {message.content}
              </p>
            )}
            {hasCard && <CardComponent />}
          </div>

          {/* Chip suggestions */}
          {message.chips && message.chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
              {message.chips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => onChipClick?.(chip)}
                  className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Verify build**

Run: `cd montgomery-navigator && npm run build:dev`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/components/app/FlowBanner.tsx src/components/app/ProcessingIndicator.tsx src/components/app/MessageBubble.tsx
git commit -m "feat(chat): add flow banner, processing indicator, and update message bubbles"
```

---

## Task 7: Build Mobile Bottom Navigation

**Files:**
- Create: `src/components/app/MobileNav.tsx`

**Step 1: Create MobileNav component**

Bottom tab bar for mobile (<768px) with 4 tabs.

```typescript
// src/components/app/MobileNav.tsx
import { MessageSquare, ClipboardList, FileText, User } from "lucide-react";

export type MobileTab = "chat" | "plan" | "docs" | "profile";

interface MobileNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  artifactCount: number;
  actionItemCount: number;
}

const TABS: { id: MobileTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "plan", label: "Plan", icon: ClipboardList },
  { id: "docs", label: "Docs", icon: FileText },
  { id: "profile", label: "Profile", icon: User },
];

export default function MobileNav({
  activeTab,
  onTabChange,
  artifactCount,
  actionItemCount,
}: MobileNavProps) {
  return (
    <nav className="flex items-center justify-around border-t border-border/50 bg-background px-2 py-1.5 lg:hidden">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const badge =
          tab.id === "docs" ? artifactCount : tab.id === "plan" ? actionItemCount : 0;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors relative ${
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{tab.label}</span>
            {badge > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-bold">
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
```

**Step 2: Verify build**

Run: `cd montgomery-navigator && npm run build:dev`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/app/MobileNav.tsx
git commit -m "feat(mobile): add bottom navigation bar"
```

---

## Task 8: Build CommandCenter Page

**Files:**
- Create: `src/pages/CommandCenter.tsx`

**Step 1: Create the main CommandCenter layout page**

This is the orchestrating page that wires together all three columns. It reads from AppContext and handles message sending (currently via demo responses).

```typescript
// src/pages/CommandCenter.tsx
import { useRef, useEffect, useState } from "react";
import { useApp } from "@/lib/appContext";
import { getDemoResponse } from "@/lib/demoResponses";
import type { ChatMessage } from "@/lib/types";
import type { MobileTab } from "@/components/app/MobileNav";

import TopBar from "@/components/app/TopBar";
import FlowSidebar from "@/components/app/FlowSidebar";
import ContextPanel from "@/components/app/ContextPanel";
import FlowBanner from "@/components/app/FlowBanner";
import ProcessingIndicator from "@/components/app/ProcessingIndicator";
import MessageBubble from "@/components/app/MessageBubble";
import ChatInput from "@/components/app/ChatInput";
import MobileNav from "@/components/app/MobileNav";

// Mobile-only views
import FlowStepper from "@/components/app/FlowStepper";
import QuickActions from "@/components/app/QuickActions";
import ActionItems from "@/components/app/ActionItems";
import DocumentShelf from "@/components/app/DocumentShelf";
import ProfileSummary from "@/components/app/ProfileSummary";

export default function CommandCenter() {
  const { state, dispatch } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [state.messages, state.isTyping]);

  // Welcome message on mount
  useEffect(() => {
    const welcome: ChatMessage = {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome to MontgomeryAI. I help you navigate benefits, jobs, and resources in Montgomery.\n\nWhat's on your mind?",
      type: "text",
      chips: [
        "Should I take this job offer?",
        "I just lost my Medicaid",
        "I want to earn more",
        "I need income but can't lose childcare",
        "I just moved to Montgomery",
        "I need to rebuild after incarceration",
      ],
    };
    dispatch({ type: "ADD_MESSAGE", message: welcome });
  }, []);

  function handleSendMessage(text: string) {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      type: "text",
    };
    dispatch({ type: "ADD_MESSAGE", message: userMessage });
    dispatch({ type: "SET_TYPING", isTyping: true });

    // Simulate processing steps
    dispatch({
      type: "SET_PROCESSING_STEPS",
      steps: [
        { label: "Understanding your situation...", status: "in_progress" },
        { label: "Checking benefits eligibility", status: "pending" },
        { label: "Searching local resources", status: "pending" },
      ],
    });

    // Simulate step-by-step processing
    setTimeout(() => {
      dispatch({
        type: "SET_PROCESSING_STEPS",
        steps: [
          { label: "Understanding your situation...", status: "completed" },
          { label: "Checking benefits eligibility", status: "in_progress" },
          { label: "Searching local resources", status: "pending" },
        ],
      });
    }, 600);

    setTimeout(() => {
      dispatch({
        type: "SET_PROCESSING_STEPS",
        steps: [
          { label: "Understanding your situation...", status: "completed" },
          { label: "Checking benefits eligibility", status: "completed" },
          { label: "Searching local resources", status: "in_progress" },
        ],
      });
    }, 1200);

    // Get and display response
    setTimeout(() => {
      const response = getDemoResponse(text);
      dispatch({ type: "ADD_MESSAGE", message: response });
      dispatch({ type: "SET_TYPING", isTyping: false });
      dispatch({ type: "SET_PROCESSING_STEPS", steps: [] });

      // Auto-generate artifact entry if response has a card
      if (response.type !== "text") {
        const artifactTitles: Record<string, string> = {
          "benefits-cliff": "Benefits Cliff Analysis",
          "job-card": "Job Recommendation",
          medicaid: "Coverage Options",
          "skill-gap": "Career Roadmap",
          reentry: "Reentry Plan",
          "pdf-preview": "Benefits Eligibility Card",
        };
        dispatch({
          type: "ADD_ARTIFACT",
          artifact: {
            id: `artifact-${Date.now()}`,
            type: response.type === "benefits-cliff" ? "A3" : "A1",
            title: artifactTitles[response.type] || "Document",
            messageId: response.id,
            createdAt: new Date(),
          },
        });
      }
    }, 1800);
  }

  // Render mobile content based on active tab
  function renderMobileContent() {
    switch (mobileTab) {
      case "plan":
        return (
          <div className="flex-1 overflow-y-auto">
            <FlowStepper />
            <hr className="border-border/30 mx-4" />
            <QuickActions onAction={(t) => { handleSendMessage(t); setMobileTab("chat"); }} />
            <hr className="border-border/30 mx-4" />
            <ActionItems />
          </div>
        );
      case "docs":
        return (
          <div className="flex-1 overflow-y-auto">
            <DocumentShelf />
          </div>
        );
      case "profile":
        return (
          <div className="flex-1 overflow-y-auto">
            <ProfileSummary />
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar
        lang={state.language}
        onLangChange={(lang) => dispatch({ type: "SET_LANGUAGE", language: lang })}
        showProfile
      />

      {/* Desktop: three-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — hidden on mobile */}
        <div className="hidden lg:block">
          <FlowSidebar onQuickAction={handleSendMessage} />
        </div>

        {/* Center — chat (or mobile tab content) */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Show mobile tab content when not on chat */}
          {mobileTab !== "chat" && (
            <div className="flex-1 lg:hidden">{renderMobileContent()}</div>
          )}

          {/* Chat — always visible on desktop, conditional on mobile */}
          <div
            className={`flex-1 flex flex-col min-w-0 ${
              mobileTab !== "chat" ? "hidden lg:flex" : "flex"
            }`}
          >
            <FlowBanner />
            <div ref={scrollRef} className="flex-1 overflow-y-auto py-4">
              {state.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onChipClick={handleSendMessage}
                />
              ))}
              <ProcessingIndicator />
            </div>
            <div className="border-t border-border/30">
              <ChatInput onSend={handleSendMessage} />
            </div>
          </div>
        </div>

        {/* Right panel — hidden on mobile */}
        <div className="hidden lg:block">
          <ContextPanel />
        </div>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav
        activeTab={mobileTab}
        onTabChange={setMobileTab}
        artifactCount={state.artifacts.length}
        actionItemCount={state.actionItems.filter((i) => !i.completed).length}
      />
    </div>
  );
}
```

**Step 2: Verify build**

Run: `cd montgomery-navigator && npm run build:dev`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/pages/CommandCenter.tsx
git commit -m "feat(layout): add CommandCenter three-column layout page"
```

---

## Task 9: Update App.tsx Routing and Wire AppProvider

**Files:**
- Modify: `src/App.tsx` (31 lines)

**Step 1: Update routing to use CommandCenter and wrap with AppProvider**

Replace the current routing:
- `/` → Splash (keep, auto-redirect to `/app` instead of `/onboarding`)
- `/app` → CommandCenter (new main interface)
- Keep `/chat` → redirect to `/app` for backward compat
- Remove Onboarding route

```typescript
// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/lib/appContext";
import Splash from "./pages/Splash";
import CommandCenter from "./pages/CommandCenter";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Splash />} />
            <Route path="/app" element={<CommandCenter />} />
            <Route path="/chat" element={<Navigate to="/app" replace />} />
            <Route path="/onboarding" element={<Navigate to="/app" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
```

**Step 2: Update Splash.tsx to redirect to `/app` instead of `/onboarding`**

In `src/pages/Splash.tsx` line 12, change the navigation target:

Change: `navigate("/onboarding");`
To: `navigate("/app");`

**Step 3: Verify the full app runs**

Run: `cd montgomery-navigator && npm run dev`
Expected: App loads at localhost:8080, splash screen appears, redirects to `/app` showing the Command Center layout

**Step 4: Commit**

```bash
git add src/App.tsx src/pages/Splash.tsx
git commit -m "feat(routing): wire CommandCenter as main app route with AppProvider"
```

---

## Task 10: Add Sidebar Background Color to CSS Tokens

**Files:**
- Modify: `src/index.css` (107 lines)

**Step 1: Verify sidebar CSS variable exists**

Check that `--sidebar-background` is defined in `index.css`. Based on the exploration, sidebar variants exist at lines 53-60. If `bg-sidebar` doesn't resolve via Tailwind, add it to the Tailwind config.

Look at the existing sidebar tokens in `index.css` (lines 53-60) and the Tailwind config to ensure `bg-sidebar` maps correctly. The existing tokens should already support this — this step is a verification.

**Step 2: Verify build and visual check**

Run: `cd montgomery-navigator && npm run dev`
Expected: Left sidebar has a subtly different background color from the main chat area.

**Step 3: Commit (if changes needed)**

```bash
git add src/index.css tailwind.config.ts
git commit -m "fix(theme): ensure sidebar background token is applied"
```

---

## Task 11: End-to-End Visual Verification

**Files:** None (verification only)

**Step 1: Run the dev server and verify each section**

Run: `cd montgomery-navigator && npm run dev`

Verification checklist:
1. Splash screen loads and auto-redirects to `/app`
2. Command Center shows three columns on desktop (≥1024px)
3. Left sidebar shows "Start a conversation to see your journey" empty state
4. Right panel shows "Insights will appear here..." empty state
5. Welcome message appears in chat with 6 quick-start chips
6. Click a chip (e.g., "Should I take this job offer?") — verify:
   - User message appears in chat
   - Processing indicator shows 3 steps animating
   - AI response with card appears
   - Left sidebar updates with flow stepper (U1, step 3)
   - Quick actions update to flow-specific actions
   - Document shelf shows new artifact
   - Right panel shows the card full-size
   - Profile summary populates with extracted data
   - Action items appear with checkboxes
7. Check responsive: resize to tablet width — sidebar collapses
8. Check responsive: resize to mobile width — bottom nav appears, three columns collapse

**Step 2: Run build to ensure production build works**

Run: `cd montgomery-navigator && npm run build`
Expected: Build succeeds with no errors

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(ui): complete Command Center frontend enhancement"
```

---

## Summary: Build Order

| Task | Description | Dependencies | Estimated Size |
|------|-------------|-------------|----------------|
| 1 | AppProvider context + types | None | Small |
| 2 | Update demo responses | Task 1 (types) | Medium |
| 3 | Flow definitions | Task 1 (types) | Small |
| 4 | Left sidebar components | Tasks 1, 3 | Medium |
| 5 | Right panel components | Task 1 | Medium |
| 6 | Chat enhancements | Task 1 | Medium |
| 7 | Mobile bottom nav | None | Small |
| 8 | CommandCenter page | Tasks 1-7 | Large |
| 9 | Routing + wiring | Task 8 | Small |
| 10 | CSS token verification | Task 9 | Tiny |
| 11 | E2E verification | All | Verification |

**Parallelizable:** Tasks 2, 3, 4, 5, 6, 7 can all be built in parallel after Task 1 completes. Task 8 depends on all of them. Tasks 9-11 are sequential.
