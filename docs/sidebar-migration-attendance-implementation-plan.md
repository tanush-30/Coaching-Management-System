# Implementation Plan: Navbar → Sidebar Migration + Student Attendance Feature

**Stack:** Next.js 14 (App Router) · TypeScript · Firebase Auth (Custom Claims RBAC) · Cloud Firestore · Tailwind CSS · Lucide React · React Query · Recharts · jsPDF

---

## Phase 0: Discovery & Audit (before writing code)

| Task | Why | Output |
|---|---|---|
| Locate current navbar component(s) for Faculty and Student portals | Confirm if shared or portal-specific | File paths |
| Check if an Admin sidebar already exists | Reuse pattern instead of rebuilding | Component reference |
| Identify how nav items are defined (hardcoded JSX vs config array) | Determines refactor complexity | Confirms if a shared `navConfig.ts` is feasible |
| Inspect Firestore schema for attendance | Needed to write correct queries | Collection/document structure |
| Check how role-based visibility is currently enforced (custom claims usage) | Sidebar must respect same RBAC rules | Claims structure |
| Check existing PDF export pattern (fees/report cards) | Reuse for attendance export | Reference component |

**Action:** Run a codebase scan for:
- `navbar`, `NavBar`, `TopNav`
- `layout.tsx` under `app/faculty/` and `app/student/`
- `attendance` (existing usage on admin/teacher side)
- Any existing `Sidebar.tsx`

---

## Phase 1: Shared Sidebar Architecture

**Goal:** Build one reusable, config-driven sidebar — not two separate hardcoded ones.

### 1.1 Nav Config Layer
Create `lib/config/navConfig.ts`:
```ts
export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: ('faculty' | 'student' | 'admin')[];
};

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/faculty/dashboard', icon: LayoutDashboard, roles: ['faculty'] },
  { label: 'Attendance', href: '/student/attendance', icon: CalendarCheck, roles: ['student'] },
  // ...migrated from existing navbars
];
```

### 1.2 Sidebar Component
Create `components/layout/Sidebar.tsx`:
- Accepts `role` prop (or reads from auth context/custom claims)
- Filters `navItems` by role
- Active-route highlighting via `usePathname()`
- Lucide icons per item
- Collapsible on mobile (hamburger + slide-in drawer), fixed on desktop (`md:` breakpoint)
- Optional: persist collapsed/expanded state via `localStorage` (client-only, guard for SSR)

### 1.3 Layout Integration
- `app/faculty/layout.tsx` → wrap children with `<Sidebar role="faculty" />` + content area
- `app/student/layout.tsx` → wrap children with `<Sidebar role="student" />` + content area
- Remove old `<Navbar />` usage from both, or repurpose navbar as a slim top header (logo, user avatar, logout) while nav links move fully to sidebar

### 1.4 Cleanup
- Delete/deprecate old navbar nav-link markup once sidebar is verified
- Confirm no broken links or missing role-gated items

**Deliverables:** `navConfig.ts`, `Sidebar.tsx`, updated `faculty/layout.tsx`, updated `student/layout.tsx`

---

## Phase 2: Student Attendance Feature

### 2.1 Route & Page
- `app/student/attendance/page.tsx`

### 2.2 Auth Scoping (critical — server-verified, not client-trusted)
- Use Next.js Middleware / server component to verify the session cookie via **Firebase Admin SDK**
- Extract the authenticated student's UID server-side
- Never accept a student ID from client-side props/query params for data fetching — always derive from verified session

### 2.3 Data Layer
- Confirm Firestore collection structure from Phase 0 (e.g., `attendance/{studentId}/records/{date}` or `attendanceRecords` with `studentId` field)
- Fetch pattern:
  - Real-time: `onSnapshot` scoped with `where('studentId', '==', uid)`
  - Or React Query wrapping a `getDocs`/API route call, if that's the existing pattern for other student-facing data
- If no API route exists yet, create `app/api/student/attendance/route.ts` that:
  1. Verifies session cookie server-side
  2. Queries Firestore scoped to that UID only
  3. Returns JSON

### 2.4 UI
- Summary cards: overall attendance %, present/absent/late counts
- Table: date-wise attendance log (use `date-fns` for formatting)
- Recharts visualization: e.g., monthly attendance trend line or subject-wise bar chart (match style used in admin/teacher attendance views for consistency)
- Empty/loading/error states

### 2.5 Optional: PDF Export
- Reuse `jsPDF` + `jspdf-autotable` pattern from fee receipts
- Export button → generates attendance summary + table as downloadable PDF

**Deliverables:** `attendance/page.tsx`, (optionally) `api/student/attendance/route.ts`, attendance table + chart components

---

## Phase 3: Testing & Validation

| Check | Method |
|---|---|
| Faculty sidebar shows only faculty-permitted items | Login as faculty, verify against claims |
| Student sidebar shows only student-permitted items | Login as student, verify |
| Attendance page shows only the logged-in student's data | Attempt to access another student's data via manipulated request — should fail server-side |
| Sidebar responsive behavior | Test mobile (<768px) and desktop breakpoints |
| Real-time sync | Update attendance in Firestore, confirm live update if using `onSnapshot` |
| PDF export (if included) | Verify generated PDF matches on-screen data |

---

## Suggested Order of Execution
1. Phase 0 discovery (confirm file paths & schema — blocks everything else)
2. `navConfig.ts` + `Sidebar.tsx` (shared component)
3. Faculty layout integration (lower risk, validate pattern)
4. Student layout integration
5. Attendance API/data layer (server-side scoping first)
6. Attendance UI (table + chart)
7. PDF export (optional, last)
8. Testing pass

---

## Open Questions (need answers before Phase 0 is truly complete)
- Exact Firestore collection/document schema for attendance
- Whether an Admin sidebar exists to extend/reuse
- Whether nav items are already config-driven or need full extraction from JSX
- Whether sidebar collapse state should persist across sessions
