# Firestore Schema Reference: Global Settings (`settings`)

This document defines the Firestore schema design for the global `settings` collection in ApexERP (Phase 1, Step 1). All downstream modules (Online Payments, PDF Receipt Generator, Notifications/Announcements, Grading/Reports) consume configurations from this unified source.

---

## Architecture Overview

- **Collection:** `settings`
- **Pattern:** Document-per-category (`settings/<categoryKey>`)
- **Document IDs:**
  1. `settings/schoolInfo`
  2. `settings/feeStructure`
  3. `settings/notificationTemplates`
  4. `settings/gradingScale`
- **Audit & Versioning:** Every document contains `updatedAt`, `updatedBy`, and `version` fields.

```
Firestore Root
└── settings (collection)
    ├── schoolInfo (document)
    ├── feeStructure (document)
    ├── notificationTemplates (document)
    └── gradingScale (document)
```

---

## 1. School Info (`settings/schoolInfo`)

Holds institution branding, contact details, tax compliance identifiers, and localization metadata.

### Fields & Data Types

| Field | Type | Required | Description | Example / Default |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | Document identifier | `'schoolInfo'` |
| `institutionName` | `string` | Yes | Official institute name | `'Apex Institute of Science & Commerce'` |
| `tagline` | `string` | Yes | Motto or subtitle | `'Empowering Future Leaders with Academic Excellence'` |
| `affiliationNumber` | `string` | No | Board or council accreditation code | `'AFF-2026-CBSE-9941'` |
| `taxNumber` | `string` | No | GSTIN or tax registration number | `'GSTIN27AAACR1234F1Z5'` |
| `email` | `string` | Yes | Official correspondence email | `'contact@apexcoaching.com'` |
| `phone` | `string` | Yes | Primary contact phone number | `'+91 98765 43210'` |
| `alternatePhone` | `string` | No | Secondary helpline / WhatsApp number | `'+91 98765 43211'` |
| `website` | `string` | No | Official website URL | `'https://apexcoaching.edu'` |
| `address` | `string` | Yes | Street address line | `'Plot 42, Knowledge Park III'` |
| `city` | `string` | Yes | City | `'Bengaluru'` |
| `state` | `string` | Yes | State / Province | `'Karnataka'` |
| `pincode` | `string` | Yes | Postal code / ZIP | `'560100'` |
| `logoUrl` | `string` | Yes | URL to logo asset | Image URL |
| `stampUrl` | `string` | No | URL to official authorized digital stamp | Image URL or empty |
| `currency` | `string` | Yes | ISO 4217 currency code | `'INR'` |
| `currencySymbol` | `string` | Yes | Display symbol | `'₹'` |
| `timezone` | `string` | Yes | IANA timezone | `'Asia/Kolkata'` |
| `academicYear` | `string` | Yes | Current active academic cycle | `'2026-2027'` |
| `updatedAt` | `string` (ISO 8601) | Yes | Timestamp of last modification | `'2026-09-13T12:00:00.000Z'` |
| `updatedBy` | `string` | Yes | Admin UID or email who made change | `'admin@apexcoaching.com'` |
| `version` | `number` | Yes | Incremental schema/edit version counter | `1` |

---

## 2. Fee Structure (`settings/feeStructure`)

Defines installment schemes, late fee penalties, grace periods, and payment gateway parameters.

### Fields & Data Types

| Field | Type | Required | Description | Example / Default |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | Document identifier | `'feeStructure'` |
| `academicYear` | `string` | Yes | Academic session applicable | `'2026-2027'` |
| `defaultInstallmentCount`| `number` | Yes | Default number of terms for new admissions | `3` |
| `availablePlans` | `array<InstallmentPlanOption>` | Yes | Array of supported installment distribution plans | See below |
| `lateFeeEnabled` | `boolean` | Yes | Whether overdue fines are calculated | `true` |
| `lateFeeGraceDays` | `number` | Yes | Grace days before fine begins | `7` |
| `lateFeeDailyAmount` | `number` | Yes | Fine per day after grace period | `50` |
| `lateFeeMaxCap` | `number` | Yes | Maximum fine cap per installment | `1500` |
| `allowedPaymentModes` | `array<string>` | Yes | Enabled payment options (`UPI`, `Cash`, etc.) | `['UPI', 'Cash', 'Card', 'Bank Transfer', 'Razorpay']` |
| `autoSendRemindersDaysBeforeDue` | `array<number>` | Yes | Days prior to due date to send alerts | `[7, 3, 1]` |
| `upiId` | `string` | No | Institute UPI Virtual Payment Address | `'apexcoaching@icici'` |
| `upiPayeeName` | `string` | No | Merchant name for UPI QR codes | `'Apex Institute of Science & Commerce'` |
| `updatedAt` | `string` (ISO 8601) | Yes | Last update timestamp | `'2026-09-13T12:00:00.000Z'` |
| `updatedBy` | `string` | Yes | Admin UID or email | `'admin@apexcoaching.com'` |
| `version` | `number` | Yes | Document version | `1` |

### `InstallmentPlanOption` Structure

```typescript
{
  id: string;                 // 'plan-tri-term'
  name: string;               // 'Tri-Term (3 Installments)'
  installmentCount: number;   // 3
  splitPercentages: number[]; // [40, 30, 30]
  description?: string;       // Plan explanation
}
```

---

## 3. Notification Templates (`settings/notificationTemplates`)

Stores message templates for automated WhatsApp, SMS, and Email dispatches with dynamic placeholders.

### Placeholders / Tokens

- `{{studentName}}` — Student's full name
- `{{date}}` — Date of event (e.g. attendance date)
- `{{batchName}}` — Name of enrolled batch
- `{{amount}}` — Formatted numeric amount
- `{{currencySymbol}}` — `₹`, `$`, etc.
- `{{dueDate}}` — Due date for payment
- `{{paymentLink}}` — Direct online payment link
- `{{receiptNumber}}` — Generated PDF receipt number
- `{{examTitle}}` — Exam or test name
- `{{marksObtained}}` / `{{totalMarks}}` / `{{percentage}}` / `{{rank}}` — Exam metrics
- `{{schoolName}}` / `{{schoolPhone}}` — Institute contact info

### Fields & Data Types

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | `'notificationTemplates'` |
| `defaultSenderChannel` | `'whatsapp' \| 'sms' \| 'email'` | Yes | Primary delivery channel |
| `templates.absenceAlert` | `NotificationTemplateItem` | Yes | Attendance absence notification |
| `templates.feeReminder` | `NotificationTemplateItem` | Yes | Upcoming/overdue fee reminder |
| `templates.paymentReceipt` | `NotificationTemplateItem` | Yes | Payment success & receipt confirmation |
| `templates.reportCard` | `NotificationTemplateItem` | Yes | Test scorecard & rank notification |
| `templates.broadcast` | `NotificationTemplateItem` | Yes | Institute general broadcast notice |
| `templates.batchAnnouncement` | `NotificationTemplateItem` | Yes | Teacher/batch specific notice |
| `updatedAt` | `string` | Yes | Timestamp |
| `updatedBy` | `string` | Yes | Admin UID |
| `version` | `number` | Yes | Version number |

---

## 4. Grading Scale (`settings/gradingScale`)

Defines marks-to-grade mapping, percentage thresholds, and GPA values for academic evaluation.

### Fields & Data Types

| Field | Type | Required | Description | Example / Default |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | Document identifier | `'gradingScale'` |
| `scaleName` | `string` | Yes | Display title | `'CBSE / Standard 10-Point Scale'` |
| `evaluationMode` | `'percentage' \| 'marks' \| 'gpa'` | Yes | Primary scoring standard | `'percentage'` |
| `passingPercentage` | `number` | Yes | Minimum score required to pass | `40` |
| `passingGrade` | `string` | Yes | Lowest passing grade | `'D'` |
| `grades` | `array<GradeBoundary>` | Yes | Array of grade bands | See table below |
| `updatedAt` | `string` | Yes | Last update timestamp | `'2026-09-13T12:00:00.000Z'` |
| `updatedBy` | `string` | Yes | Admin UID | `'admin@apexcoaching.com'` |
| `version` | `number` | Yes | Version counter | `1` |

### Default `GradeBoundary` Mapping

| Grade | Min Score | Max Score | GPA Point | Remarks | Color Code |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `A+` | 90 | 100 | 10.0 | Outstanding Performance | `#10b981` |
| `A` | 80 | 89.99 | 9.0 | Excellent Mastery | `#059669` |
| `B+` | 70 | 79.99 | 8.0 | Very Good Understanding | `#3b82f6` |
| `B` | 60 | 69.99 | 7.0 | Good Competency | `#6366f1` |
| `C` | 50 | 59.99 | 6.0 | Satisfactory Progress | `#f59e0b` |
| `D` | 40 | 49.99 | 5.0 | Pass / Minimum Threshold | `#ea580c` |
| `F` | 0 | 39.99 | 0.0 | Needs Remedial Support | `#ef4444` |

---

## Integration Guide

- **Step 2 (Admin UI):** The Admin Settings panel directly reads/writes these 4 documents via `getSettingsCategory` and `saveSettingsCategory`.
- **Step 3 (Integration):**
  - **Payment Module:** Reads `feeStructure` for installment plans and late fee computation.
  - **Receipt Module:** Reads `schoolInfo` for institution name, logo, address, and GSTIN on PDF receipts.
  - **Announcements / WhatsApp:** Reads `notificationTemplates` and uses `interpolateTemplate(template, vars)` to dynamically compose notifications.
  - **Exams / Scorecards:** Reads `gradingScale` to calculate grades, GPA points, and pass/fail indicators automatically.
