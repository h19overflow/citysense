# CV Upload Tab — Design

**Date:** 2026-03-05
**Context:** New tab within Command Center, accessible via left sidebar navigation

---

## Decision

**Layout:** Split Panel — left half is the upload zone + file status, right half shows analyzed CV results in structured cards.

**Navigation:** Sidebar navigation — "Chat" and "CV Upload" are top-level items at the top of the left sidebar (above the flow stepper). No tabs in TopBar.

**Scope:** Mock data only. User uploads a file → simulated analysis → display hardcoded extracted data. No real parsing.

---

## Layout

### Desktop

```
┌──────────────────────────────────────────────────────────────────┐
│  TopBar: MontgomeryAI                           [EN|ES] [👤]    │
├────────────┬─────────────────────────────┬───────────────────────┤
│ LEFT       │  CENTER AREA                │  RIGHT PANEL          │
│ SIDEBAR    │                             │                       │
│            │  ┌─UPLOAD─────┬─RESULTS────┐│  (context-sensitive)  │
│ [💬 Chat ] │  │            │            ││                       │
│ [📄 CV   ] │  │  Drop zone │ Personal   ││  Shows extracted      │
│            │  │  + file    │ Info card  ││  profile summary      │
│ ────────── │  │  status    │            ││  when CV is analyzed  │
│            │  │            │ Experience ││                       │
│ Flow       │  │            │ cards      ││                       │
│ Stepper    │  │            │            ││                       │
│            │  │            │ Education  ││                       │
│ Quick Acts │  │            │ card       ││                       │
│            │  │            │            ││                       │
│ Docs       │  │            │ Skills     ││                       │
│            │  │            │ badges     ││                       │
│            │  └────────────┴────────────┘│                       │
└────────────┴─────────────────────────────┴───────────────────────┘
```

### Mobile

Bottom nav gets a 5th tab: "CV" — or replaces "Docs" since CV upload is more important for demo. When on mobile, the split panel stacks vertically (upload on top, results below).

---

## Upload Zone States

1. **Empty** — Large dashed border drop zone with icon, "Drop your CV here or browse". Accepted: PDF, DOCX, TXT. Max 10MB.
2. **Dragging** — Border turns primary color, background highlight, "Release to upload"
3. **Uploading** — File name + progress bar + spinner
4. **Analyzing** — "Analyzing your CV..." with animated processing steps
5. **Complete** — File name + size + green checkmark. "Upload new" link.
6. **Error** — Red border, error message, retry button.

---

## Analysis Results (Mock Data)

When "analysis" completes (simulated 2s delay), display:

### Personal Info Card
```
Name: Sarah Mitchell
Email: sarah.mitchell@email.com
Phone: (334) 555-0147
Location: Montgomery, AL 36104
```

### Work Experience (2 entries)
```
Amazon Fulfillment Center — Montgomery, AL
Fulfillment Associate · Mar 2022 – Present (3 years)
• Processed 150+ packages daily with 99.2% accuracy
• Trained 12 new team members on safety protocols
• Promoted to shift lead after 18 months

Walmart Supercenter — Prattville, AL
Cashier / Customer Service · Jun 2019 – Feb 2022 (2 yr 8 mo)
• Handled $5,000+ daily transactions
• Resolved customer complaints, maintained 4.8/5 rating
• Managed self-checkout area for 8 registers
```

### Education
```
Jefferson Davis High School — Montgomery, AL
Diploma · 2019
```

### Skills (badges)
```
[Customer Service] [Inventory Management] [Team Leadership]
[Cash Handling] [Safety Protocols] [Forklift Certified]
[Microsoft Office] [Bilingual: EN/ES]
```

### Summary Card
```
3+ years in fulfillment/logistics. Strong candidate for:
• Quality Control Technician (via AIDT cert)
• Shift Supervisor (current trajectory)
• Warehouse Operations Manager (12-month path)
```

---

## Component List

| Component | Purpose |
|-----------|---------|
| `CvUploadView.tsx` | Split-panel container for the CV tab |
| `UploadZone.tsx` | Drag-and-drop file upload area with states |
| `CvAnalysisResults.tsx` | Container for all result cards |
| `PersonalInfoCard.tsx` | Name, email, phone, location |
| `ExperienceCard.tsx` | Work history entries with timeline |
| `EducationCard.tsx` | Education entries |
| `SkillBadges.tsx` | Skill tag cloud |
| `CvSummaryCard.tsx` | AI-generated career summary |

---

## Integration with Command Center

- `FlowSidebar` gains two nav items at top: Chat / CV Upload
- `CommandCenter` gains a `view` state: "chat" | "cv"
- When `view === "cv"`, center area renders `CvUploadView` instead of chat
- Right panel adapts: shows extracted profile data when CV is analyzed
- Mobile: `MobileNav` gains a CV tab
