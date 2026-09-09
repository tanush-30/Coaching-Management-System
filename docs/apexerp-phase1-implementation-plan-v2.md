# ApexERP — Phase 1 Implementation Plan (v2)
## Goal: Replace localStorage + Add Auth + Fix Build Errors

> This is a revised version of the original Phase 1 plan, updated after a security/architecture review. Changes from v1 are marked with 🔄.

---

## Background

ApexERP currently stores all data in `localStorage` via a custom hook `useERPStore()` in `src/lib/store.ts`. There is no authentication. TypeScript and ESLint errors are suppressed via `next.config.mjs`. This plan migrates Phase 1 to production-ready infrastructure.

---

## Tech Stack Chosen (Free Tier, Zero Setup)

| Need | Tool | Why |
|---|---|---|
| Database | **Supabase** (PostgreSQL) | Free tier, instant REST + realtime API, no server needed |
| Auth | **Supabase Auth** | OTP/email built-in, integrates with same project |
| API layer | **Next.js API Routes** (`/app/api/`) | No extra backend needed |
| State | **React Query / SWR** | Replace useState-based store with server state — 🔄 now actually used in Data Layer section below, not just named |

> [!IMPORTANT]
> The user needs a free Supabase account at https://supabase.com before execution. A project URL and anon key will be needed.

---

## Open Questions

> [!IMPORTANT]
> **Q1:** Do you have a Supabase account? If not, we will set one up as part of Step 1.
>
> **Q2:** For Auth — should login use **Email + Password**, **Phone OTP**, or **both**?
>
> **Q3:** Existing mock/demo data — seed fresh, or migrate real data currently sitting in browser `localStorage`? (🔄 See new "Data Migration Script" section — this now has a concrete answer either way.)
>
> **Q4 (new):** On student deletion, should related records (fees, attendance, marks) be hard-deleted or archived? Recommendation below is soft-delete — confirm before implementation.

---

## 🔄 Rollout Strategy (New)

Rather than ripping out `localStorage` and adding auth in one 8-10 hour pass, this will be staged to reduce risk:

1. **Stage A** — Build Supabase schema + API routes + Supabase-backed store functions *alongside* the existing localStorage store, behind a feature flag (e.g. `NEXT_PUBLIC_USE_SUPABASE=true`).
2. **Stage B** — Test the Supabase path in parallel with localStorage still live as fallback.
3. **Stage C** — Add auth + middleware once the data layer is verified working.
4. **Stage D** — Cut over: remove the flag and the localStorage code path.

This means auth and data-layer migration are no longer forced into a single irreversible commit.

---

## Proposed Changes

### Component: Infrastructure & Config

#### [MODIFY] `next.config.mjs`
- Remove `ignoreBuildErrors: true` and `ignoreDuringBuilds: true`
- After removal, run `npm run build` to surface all hidden type errors
- Fix each error surfaced (likely `any` types in `pdf-service.ts` autoTable extension)

#### [NEW] `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  (server-side only)
NEXT_PUBLIC_USE_SUPABASE=false   # 🔄 feature flag for staged rollout
```

#### 🔄 [NEW] `.env.example`
- Committed to the repo (no real secrets) so anyone cloning the project knows which env vars are required.

#### 🔄 [NOTE] Production deployment
- These env vars must also be set in the hosting provider's dashboard (e.g. Vercel → Project Settings → Environment Variables), not just `.env.local`.

#### [NEW] `src/lib/supabase.ts`
- Supabase client singleton (browser)
- Supabase admin client (server-side API routes)

---

### Component: Database Schema

#### Supabase Tables (SQL migration)
```sql
-- students, batches, teachers, fee_installments,
-- batch_attendance, attendance_records, exams,
-- student_exam_marks, homework, study_materials,
-- whatsapp_logs, 🔄 user_roles
```
All tables include:
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `created_at TIMESTAMPTZ DEFAULT NOW()`
- 🔄 `deleted_at TIMESTAMPTZ NULL` — soft-delete marker on `students`, `fee_installments`, `attendance_records`, `student_exam_marks` (see Cascade Behavior below)
- Row Level Security (RLS) policies per role

#### 🔄 [NEW] `user_roles` table (replaces relying on `user_metadata`)
```sql
create table user_roles (
  user_id uuid references auth.users(id) primary key,
  role text not null check (role in ('admin', 'teacher', 'parent', 'student'))
);
-- Only writable via service_role key (server-side), never from the client
```

#### 🔄 Example RLS Policies (concrete, not hand-waved)
```sql
-- Admins can do anything
create policy "admins full access"
on students for all
using (
  exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
);

-- Teachers can only update attendance for their own batches
create policy "teachers update own batch attendance"
on batch_attendance for update
using (
  exists (
    select 1 from user_roles ur
    join batches b on b.teacher_id = ur.user_id
    where ur.user_id = auth.uid()
      and ur.role = 'teacher'
      and b.id = batch_attendance.batch_id
  )
);

-- Parents can only read their own child's fee records
create policy "parents read own child fees"
on fee_installments for select
using (
  exists (
    select 1 from students s
    where s.id = fee_installments.student_id
      and s.parent_user_id = auth.uid()
  )
);
```
These three cover the highest-risk paths (admin bypass, teacher scope, parent data isolation) and should be written/tested before building more.

---

### Component: Authentication

#### [NEW] `src/app/login/page.tsx`
- Email + password login form (styled consistent with ApexERP design)
- Supabase `signInWithPassword()` call
- Redirect to `/` on success

#### [NEW] `src/middleware.ts`
- Next.js middleware that checks Supabase session on every request
- Unauthenticated → redirect to `/login`
- 🔄 Role read from the `user_roles` table (via a server-side lookup), **not** `user.user_metadata.role`

#### 🔄 [SECURITY FIX] Role storage
- **v1 problem:** `user_metadata` is client-writable — any authenticated user could call `supabase.auth.updateUser()` and set their own role to `admin`, bypassing all role checks.
- **v2 fix:** Roles live in the new `user_roles` table, only writable via the service-role key from server-side code (e.g. an admin API route or Supabase dashboard). RLS policies and middleware both read from this table.

#### [MODIFY] `page.tsx`
- Remove `useState<UserRole>('admin')` role switcher
- Read role from `user_roles` table lookup (server component or API call), not client-side session metadata
- Admin-only tabs locked server-side, enforced again by RLS as defense-in-depth

---

### Component: Data Layer (Replace localStorage)

#### 🔄 Data-fetching pattern
All reads go through React Query hooks (not raw `useEffect` + `useState`), giving automatic loading/error/refetch states for free:
```ts
// src/hooks/useStudents.ts
export function useStudents() {
  return useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*').is('deleted_at', null);
      if (error) throw error;
      return data;
    },
  });
}
```
Every component currently reading `store.students` synchronously needs to be updated to handle `isLoading` / `isError` states — this touches most of the UI, not just the store file, and should be scoped accordingly.

#### [MODIFY] `store.ts`
Replace all 10 `localStorage` read/write blocks with Supabase-backed equivalents (behind the feature flag per Rollout Strategy):

| Function | localStorage → Supabase |
|---|---|
| Load students | `useStudents()` React Query hook → `supabase.from('students').select('*')` |
| `addStudent()` | `supabase.from('students').insert(student)` |
| `updateStudent()` | `supabase.from('students').update().eq('id', id)` |
| `deleteStudent()` | 🔄 soft delete: `supabase.from('students').update({ deleted_at: now() }).eq('id', id)` |
| `recordPayment()` | 🔄 see "Payment Guard" below — not a plain update |
| `markBatchAttendance()` | `supabase.from('batch_attendance').upsert()` |
| `saveExamMarks()` | `supabase.from('student_exam_marks').upsert()` |
| `sendBroadcastMessage()` | `supabase.from('whatsapp_logs').insert()` |

#### [MODIFY] `store.ts` — IDs
- Replace ALL `Date.now()` and `Math.random()` IDs with `crypto.randomUUID()`

#### 🔄 [DESIGN] Payment double-payment guard
A JS-side `if (status !== 'paid')` check is not sufficient — two rapid clicks can both pass the check before either write lands (race condition). Instead, enforce it at the database level:
```sql
create or replace function record_payment(installment_id uuid, amount numeric)
returns void as $$
begin
  update fee_installments
  set status = 'paid', paid_at = now(), paid_amount = amount
  where id = installment_id and status != 'paid';

  if not found then
    raise exception 'Installment already paid or does not exist';
  end if;
end;
$$ language plpgsql;
```
Called via `supabase.rpc('record_payment', { installment_id, amount })`. The `where status != 'paid'` combined with Postgres row locking makes this atomic — no race condition possible.

#### 🔄 [DESIGN] Cascade / delete behavior
- **Students:** soft delete (`deleted_at`) — preserves fee/attendance/exam history for records already tied to them, avoids breaking foreign keys, allows "restore" later.
- **Fee installments, attendance records, exam marks:** never hard-deleted; excluded from normal queries via `WHERE deleted_at IS NULL` / `WHERE student.deleted_at IS NULL` joins.
- Hard delete only available as a separate, explicitly-audited admin action (out of scope for Phase 1).

#### 🔄 [NEW] Data migration script — `scripts/migrate-localstorage.ts`
For users with real data already in browser `localStorage` (per Q3):
1. Export existing localStorage JSON from the browser (dev tools → Application → Local Storage → copy value, or a small in-app "Export Data" button added temporarily)
2. Script reads the exported JSON, transforms each entity to match the new Supabase schema (e.g. regenerates IDs as UUIDs, maps old string IDs to new ones for foreign keys)
3. Bulk-inserts via the Supabase admin client
4. Prints a summary + writes a mapping file (`old_id → new_id`) for auditing

If Q3 answer is "start fresh," this script is skipped entirely — demo data gets seeded via a plain SQL seed file instead.

#### [NEW] `src/app/api/students/route.ts`
- GET, POST handlers for student CRUD using Supabase admin client

#### [NEW] `src/app/api/fees/route.ts`
- PATCH handler calling the `record_payment` RPC function above (not a raw update)

---

### Component: Build Error Fixes

#### [MODIFY] `pdf-service.ts`
- Fix `autoTable: (options: any)` — type the options properly
- Remove `any` casts

#### Across all components
- Fix implicit `any` types surfaced after removing `ignoreBuildErrors`
- Likely locations: `MarksEntryModal.tsx`, `AcademicManagement.tsx`, `AdminAnalytics.tsx`

---

## Verification Plan

### Automated
```bash
npm run build          # Must pass with 0 errors
npm run lint           # Must pass with 0 warnings
```

### Manual
1. Visit `/` → redirected to `/login` ✅
2. Login as admin → see full dashboard ✅
3. Add a student → refresh page → data still present ✅
4. Login from another browser tab → same data visible ✅
5. Click "Teacher" role without being teacher → blocked ✅
6. 🔄 Attempt to self-elevate role via `supabase.auth.updateUser()` in browser console → blocked (role table unaffected) ✅
7. 🔄 Double-click "Pay" on the same installment rapidly → only one payment recorded ✅
8. 🔄 Delete a student → their fee/attendance history still queryable by admin (soft delete) but hidden from normal lists ✅
9. 🔄 Run migration script against a sample exported localStorage dataset → verify row counts match ✅

---

## Estimated Effort

| Task | Time |
|---|---|
| Supabase setup + schema + `user_roles` table | 1–2 hrs |
| RLS policy writing + testing (🔄 budgeted realistically) | 2–3 hrs |
| Auth (login page + middleware, reading from `user_roles`) | 1–2 hrs |
| Store migration (localStorage → Supabase, React Query hooks) | 3–4 hrs |
| API routes + payment RPC function | 2 hrs |
| 🔄 Data migration script | 1–2 hrs |
| Build error fixes | 1–2 hrs |
| **Total** | **🔄 ~12–15 hrs** |
