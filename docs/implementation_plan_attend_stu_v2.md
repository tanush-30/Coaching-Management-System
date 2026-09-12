# Implementation Plan: Navbar → Sidebar Migration + Student Attendance Feature

Migrate the Faculty and Student portals from top navigation tabs to a modern, responsive, config-driven sidebar architecture (matching the existing Super Admin sidebar design), and implement a dedicated Student Attendance tracking feature complete with attendance statistics, Recharts visual analytics, date-wise log history, and downloadable PDF reports.

## Proposed Architecture & Changes

### 1. Navigation Config & Shared Sidebar Component
Create a reusable, role-gated navigation configuration layer and modern collapsible sidebar component:
- **`src/lib/config/navConfig.ts`**: Single source of truth for navigation links, icons, roles, and badge metadata.
  - Confirm scope of `roles` before building: currently only `faculty` and `student` portals exist in this codebase. Do **not** include `'parent'` in the role union unless a parent portal is already planned/exists — adding it now is speculative and untested. Add it later when that portal is actually built.
- **`src/components/common/PortalSidebar.tsx`**: A sleek, collapsible, mobile-friendly sidebar supporting role-specific views (`faculty`, `student`), active tab/route highlighting, badge counters, user profile card, and quick logout.
  - **Collapse-state persistence decision:** Persist expanded/collapsed state in `localStorage` per-device (not per-session), guarded with a client-only check (`typeof window !== 'undefined'`) to avoid SSR/hydration mismatches. Falls back to "expanded" on first load / SSR pass.

---

### 2. Student Portal Sidebar Migration & Attendance Integration
- **`src/components/portal/StudentPortal.tsx`**:
  - Update layout to incorporate the responsive sidebar layout with collapse/expand support and mobile drawer.
  - Add **`Attendance`** tab to the navigation item list alongside `Homework`, `Study Notes`, `Results & Ranks`, and `Class Timetable`.
  - Include attendance statistics in the student store/props (`attendance: BatchAttendance[]`).

- **`src/components/portal/StudentAttendanceView.tsx`** (New Component):
  - **KPI Summary Cards**: Overall Presence Rate (%), Total Classes Conducted, Present Days, Absent Days, Late Days.
  - **Visual Performance Chart**: Recharts monthly attendance trend and status distribution.
  - **Date-wise Filterable Attendance Table**: Search and filter by status (All, Present, Absent, Late), date, and remarks.
  - **Downloadable Attendance PDF Report**: Export student-specific official attendance certificate & detailed date ledger using `jsPDF` + `jspdf-autotable`.
  - **Loading / empty / error states**: Show a skeleton/loader while fetching; a clear "No attendance records yet" empty state for new students with zero records; and a retry-capable error state if the Firestore read fails.

#### 2a. Data Scoping & Fetch Strategy (new — required before implementation)
This is the most security-sensitive part of the feature and needs to be locked down explicitly:

- **Identity source of truth:** The student UID used to query attendance must come from the **server-verified session** (Firebase Admin SDK session cookie, resolved in middleware or a server component) — never from a client-side prop, route param, or query string that could be edited in devtools.
- **Fetch pattern:** Decide and document one of:
  - **Option A (real-time):** `onSnapshot` on the attendance collection, scoped with `where('studentId', '==', uid)`, called from a client component that receives `uid` only after server-side verification.
  - **Option B (request/response):** New route handler `src/app/api/student/attendance/route.ts` that verifies the session cookie server-side, queries Firestore scoped to that UID, and returns JSON; consumed via React Query for caching/refetch.
  - Pick whichever matches the existing pattern used elsewhere in the student portal (e.g., how `Homework` or `Results` currently fetch data) for consistency — don't introduce a third pattern.
- **PDF export data source:** The export must pull from the same scoped, already-fetched dataset shown on screen (not a fresh unscoped query), so the PDF can never contain another student's rows even if reused/copy-pasted.

---

### 3. Faculty / Teacher Portal Sidebar Migration
- **`src/components/portal/TeacherPortal.tsx`**:
  - Migrate top navigation banner tabs (`Schedule & Classes`, `Homework & Assignments`, `Substitute Requests`, `Student Roster`) to the left collapsible sidebar.
  - Retain top bar with quick actions (Post Homework, Schedule class) and user profile switch.

---

### 4. PDF Generation Service Extension
- **`src/lib/pdf-service.ts`**:
  - Add `generateStudentAttendancePDF(student, batch, attendanceHistory)` to produce official institute attendance certificates with branding, percentages, and tabular records.
  - `attendanceHistory` passed in must already be scoped to the logged-in student (see §2a) — this function should not perform its own Firestore query.

---

## Files to Modify & Create

### Shared Navigation & Layout
#### [NEW] [navConfig.ts](file:///c:/Users/bunny/Documents/projects/Coaching%20Management%20System/src/lib/config/navConfig.ts)
#### [NEW] [PortalSidebar.tsx](file:///c:/Users/bunny/Documents/projects/Coaching%20Management%20System/src/components/common/PortalSidebar.tsx)

### Student Portal & Attendance Feature
#### [MODIFY] [StudentPortal.tsx](file:///c:/Users/bunny/Documents/projects/Coaching%20Management%20System/src/components/portal/StudentPortal.tsx)
#### [MODIFY] [student/page.tsx](file:///c:/Users/bunny/Documents/projects/Coaching%20Management%20System/src/app/student/page.tsx)
#### [NEW] [StudentAttendanceView.tsx](file:///c:/Users/bunny/Documents/projects/Coaching%20Management%20System/src/components/portal/StudentAttendanceView.tsx)
#### [MODIFY] [pdf-service.ts](file:///c:/Users/bunny/Documents/projects/Coaching%20Management%20System/src/lib/pdf-service.ts)
#### [NEW, conditional on Option B above] [api/student/attendance/route.ts](file:///c:/Users/bunny/Documents/projects/Coaching%20Management%20System/src/app/api/student/attendance/route.ts)

### Faculty / Teacher Portal
#### [MODIFY] [TeacherPortal.tsx](file:///c:/Users/bunny/Documents/projects/Coaching%20Management%20System/src/components/portal/TeacherPortal.tsx)
#### [MODIFY] [teacher/page.tsx](file:///c:/Users/bunny/Documents/projects/Coaching%20Management%20System/src/app/teacher/page.tsx)

---

## Verification Plan

### Automated Type & Build Checks
- Run `npx tsc --noEmit` to verify type safety across all components and props.

### Manual Verification
1. **Student Portal Sidebar & Attendance:**
   - Log into `/login/student` and verify the new collapsible sidebar layout.
   - Switch between tabs (Attendance, Homework, Study Notes, Results, Timetable).
   - Verify attendance calculations (Present %, Absent %, Late counts) match recorded attendance.
   - Click "Download Attendance PDF" and verify generated PDF layout.
2. **Teacher Portal Sidebar:**
   - Log into `/login/teacher` and verify the responsive sidebar layout.
   - Verify navigation between Schedule, Homework, Substitute, and Roster works seamlessly.
3. **Responsive Breakpoints:**
   - Verify sidebar collapses on mobile viewports (<768px) into a slide-over drawer with hamburger toggle.

### Security & Data-Scoping Checks (new)
4. **Cross-student access attempt:** While logged in as Student A, try to force-fetch Student B's attendance (e.g., editing a request payload or query param in devtools/network tab). Confirm the server rejects it or ignores the tampered value and always resolves the UID from the verified session.
5. **Role-based nav filtering:** Confirm a student account never sees faculty-only sidebar items (and vice versa) — check both that the link is hidden in the UI and that the underlying route is also protected server-side (middleware), not just hidden client-side.
6. **Empty/error states:** Test with a student who has zero attendance records, and simulate a Firestore read failure (e.g., offline/network throttling) to confirm the empty and error states render correctly instead of a blank screen or crash.

### Edge Cases
7. **PDF export consistency:** Confirm the downloaded PDF's numbers exactly match what's on screen at the time of export (no stale/unscoped data).
8. **Sidebar collapse persistence:** Reload the page after collapsing the sidebar; confirm state persists (per the decision in §1) and there's no layout flash/hydration mismatch on first paint.
