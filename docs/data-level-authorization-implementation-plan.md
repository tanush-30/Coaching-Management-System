# Data-Level Authorization Implementation Plan
### Coaching Management System (Apex ERP) — Next.js 14 + Firebase

---

## Objective

Fix horizontal privilege escalation so that students and faculty can only access records that belong to them. Being logged in should not be enough to view or edit *any* student's data — access must be scoped to the individual's own records (students) or assigned batches (faculty).

---

## The Problem

Currently, Firestore rules and/or API routes likely check **"is this user authenticated?"** but not **"does this specific record belong to this user?"**. This means:

- A logged-in student can view another student's profile, attendance, fees, or exam results by changing an ID in the URL or API request.
- A faculty member can potentially view students outside their assigned batch/class.

This is a **data-level (horizontal) authorization** issue, distinct from the earlier admin login/role work — it applies *within* the student and faculty roles themselves.

---

## Requirements

1. Every student document must be linked to the Firebase Auth `uid` that owns it (e.g. `students/{studentId}` uses the `uid` as the doc ID, or stores an `authUid` field).
2. Firestore Security Rules must check **ownership**, not just authentication:
   - A student can only `read` their own document.
   - A faculty member can only `read` documents of students assigned to their batch/class.
3. API routes (`/api/students/[id]`, `/api/attendance/[id]`, etc.) must **never trust the `id` param alone** — they must re-derive the authenticated user's `uid` server-side from the verified session and check it against the record's owner before returning data.
4. Faculty access must be scoped by **assignment** (`teacherId` on the batch/class, student's `batchId` matching a batch that teacher owns) — not "faculty can see all students."
5. The same ownership check must apply to **writes**, not just reads — a student should never be able to edit another student's fee/attendance/exam record.
6. Apply this ownership pattern consistently across **every collection**: students, attendance, fees, exams, results — not just one.

---

## Implementation Steps

### 1. Link Records to Auth UID

Ensure every student document is identifiable by the owning user's Firebase Auth `uid`:

```ts
// Option A (preferred): use uid as the document ID
students/{uid}

// Option B: store an explicit field
students/{studentId} = { authUid: "abc123", batchId: "batch_9A", ... }
```

Using the `uid` as the document ID simplifies rule-writing and avoids extra lookups.

---

### 2. Firestore Security Rules — Ownership Checks

**Student record — student can read only their own; faculty via batch assignment; admin unrestricted:**

```js
match /students/{studentId} {
  allow read: if request.auth != null &&
    (
      request.auth.uid == studentId ||
      request.auth.token.role == "admin" ||
      (
        request.auth.token.role == "teacher" &&
        get(/databases/$(database)/documents/batches/$(resource.data.batchId)).data.teacherId == request.auth.uid
      )
    );

  allow write: if request.auth != null && request.auth.token.role == "admin";
}
```

**Attendance — student sees only their own; faculty sees only records for their batch:**

```js
match /attendance/{recordId} {
  allow read: if request.auth != null &&
    (
      resource.data.studentUid == request.auth.uid ||
      request.auth.token.role == "admin" ||
      (
        request.auth.token.role == "teacher" &&
        resource.data.teacherUid == request.auth.uid
      )
    );

  allow write: if request.auth != null &&
    (request.auth.token.role == "admin" || request.auth.token.role == "teacher");
}
```

Apply the same pattern to `fees`, `exams`, and `results` collections — each should check `studentUid == request.auth.uid` for student reads, and `teacherId`/`batchId` assignment for faculty reads.

---

### 3. API Route — Defense in Depth

Firestore rules alone aren't sufficient if data is also served through custom API routes (e.g. for PDF generation, aggregation, or third-party integrations). Every such route must independently verify ownership server-side.

```ts
// src/app/api/students/[id]/route.ts
export const runtime = "nodejs";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { cookies } from "next/headers";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = cookies().get("session")?.value;
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const decoded = await adminAuth.verifySessionCookie(session, true);
  const { uid, role } = decoded as { uid: string; role?: string };

  const studentDoc = await adminDb.collection("students").doc(params.id).get();
  if (!studentDoc.exists) return Response.json({ error: "not found" }, { status: 404 });

  const student = studentDoc.data()!;

  const isOwner = uid === params.id;
  const isAdmin = role === "admin";
  const isAssignedFaculty =
    role === "teacher" &&
    (await adminDb.collection("batches").doc(student.batchId).get()).data()?.teacherId === uid;

  if (!isOwner && !isAdmin && !isAssignedFaculty) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  return Response.json(student);
}
```

**Key principle:** never let the client dictate whose data to return via a URL param or query string alone. Always re-derive `uid` and `role` from the *verified* session, then check that against the record's actual owner/assignment before responding.

Apply this same pattern to `PUT`/`PATCH`/`DELETE` handlers, and to every other collection's API routes (attendance, fees, exams, results).

---

### 4. Audit Every Collection

Go through each collection and confirm an ownership or assignment check exists for both rules and API routes:

| Collection    | Student access rule                  | Faculty access rule                        | API route checked? |
|---------------|---------------------------------------|---------------------------------------------|---------------------|
| `students`    | `uid == studentId`                    | `teacherId` on student's `batchId`          | ☐ |
| `attendance`  | `studentUid == request.auth.uid`      | `teacherUid == request.auth.uid`            | ☐ |
| `fees`        | `studentUid == request.auth.uid`      | via `batchId` assignment (read-only, if applicable) | ☐ |
| `exams`       | `studentUid == request.auth.uid`      | via `batchId` assignment                    | ☐ |
| `results`     | `studentUid == request.auth.uid`      | via `batchId` assignment                    | ☐ |

---

### 5. Test Cases to Verify

- [ ] Student A cannot fetch Student B's profile via direct API call with B's ID.
- [ ] Student A cannot fetch Student B's attendance/fees/exam records.
- [ ] Student A cannot write/edit Student B's records.
- [ ] Faculty member teaching Batch X cannot read students in Batch Y.
- [ ] Faculty member cannot write to a batch they are not assigned to.
- [ ] Admin retains full read/write access across all collections.
- [ ] Firestore Rules simulator (Firebase Console → Rules Playground) confirms denies for cross-user access.

---

## Checklist

- [ ] Student documents linked to `uid` (as doc ID or `authUid` field)
- [ ] Firestore rules updated with ownership checks for `students`
- [ ] Firestore rules updated with ownership checks for `attendance`
- [ ] Firestore rules updated with ownership checks for `fees`
- [ ] Firestore rules updated with ownership checks for `exams`
- [ ] Firestore rules updated with ownership checks for `results`
- [ ] All corresponding API routes re-verify `uid`/`role` server-side (not trusting URL params)
- [ ] Faculty access scoped via batch/class assignment, not blanket access
- [ ] Write operations (`PUT`/`PATCH`/`DELETE`) also enforce ownership
- [ ] Manual test cases above verified in staging before deploying to production

---

## Notes

- This is separate from (and builds on top of) the admin authentication work — that plan secures *who can log in as admin*; this plan secures *what each logged-in user can see once authenticated*.
- Ownership checks should exist in **both** Firestore Security Rules and API route handlers. Rules protect direct Firestore access (e.g. from the client SDK); API routes protect server-side logic like PDF generation or aggregated reports that rules alone can't cover.
- Never rely on the client to send the "correct" `uid` — always derive it from the verified session/token.
