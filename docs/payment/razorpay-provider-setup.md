# Razorpay Payment Gateway Provider Setup

## 1. Overview & Architecture

The Coaching Management System uses **Razorpay** as its primary online payment gateway provider for fee collection across Student, Parent, and Admin portals.

### Security Boundary & Flow Architecture
1. **Server-side Order Creation**: Student or Parent requests an order via `/api/payment/create-order`. The server invokes the Razorpay SDK using `RAZORPAY_KEY_SECRET` (never exposed to client) and generates an `order_id`.
2. **Client-side Checkout (Modal/UPI)**: Client receives `order_id` and loads Razorpay standard checkout using `NEXT_PUBLIC_RAZORPAY_KEY_ID`.
3. **Cryptographic Verification**: On success, the client sends `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature` to `/api/payment/verify-signature`. The server uses HMAC-SHA256 with `RAZORPAY_KEY_SECRET` to verify authenticity.
4. **Server Webhooks (Asynchronous Backup)**: Webhook endpoints listen for `payment.captured` and `payment.failed` events to ensure database consistency even if the user closes their browser before redirection.

---

## 2. Environment Variables Configuration

| Variable Name | Exposure | Description | Example (Test Mode) |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Public (Client + Server) | Base URL for callbacks & redirect handlers | `http://localhost:3000` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Public (Client + Server) | Razorpay Public Key ID used by frontend checkout scripts | `rzp_test_51K9DEMOKEY9988` |
| `RAZORPAY_KEY_SECRET` | Private (Server-Only) | Razorpay Secret Key used for order creation & HMAC verification | `rzp_sec_51K9DEMOSECRET9988` |
| `RAZORPAY_WEBHOOK_SECRET` | Private (Server-Only) | Webhook Secret for validating `x-razorpay-signature` | `rzp_whsec_51K9DEMOWEBHOOK9988` |

> [!CAUTION]
> Never prefix `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET` with `NEXT_PUBLIC_`. Doing so exposes your secret credentials to client-side browsers and compromises financial security.

---

## 3. Sandbox / Test Credentials & Simulation

### Sandbox Registration
1. Sign up / Log in to [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Toggle the switch to **Test Mode** in the dashboard top header.
3. Navigate to **Settings > API Keys** and click **Generate Key**.
4. Copy `Key Id` and `Key Secret` into your `.env.local` file.

### Test UPI Virtual Payment Addresses (VPAs)

| UPI VPA | Simulation Outcome | Behavior |
|---|---|---|
| `success@razorpay` | Instant Success | Simulates a successful UPI payment flow immediately |
| `failure@razorpay` | Instant Failure | Simulates a declined or failed UPI payment flow |
| `pending@razorpay` | Pending / Timeout | Simulates delayed authorization or bank timeout |

### Test Cards (Visa / Mastercard)

| Parameter | Value |
|---|---|
| **Card Number** | `4111 1111 1111 1111` (Visa) or `5123 4567 8901 2345` (Mastercard) |
| **Expiry Date** | Any future date (e.g. `12/28`) |
| **CVV** | Any 3 digits (e.g. `123`) |
| **OTP Simulation** | Enter `1234` or click **Success** on the Razorpay sandbox 3DS page |

---

## 4. Server-Side Integration Contracts

### A. Order Creation Payload (`/api/payment/create-order`)

**Request to Razorpay API:**
```json
{
  "amount": 500000,
  "currency": "INR",
  "receipt": "rcpt_fee_1710319200000",
  "notes": {
    "studentId": "STU-2024-001",
    "studentName": "Rahul Sharma",
    "month": "March 2024",
    "classId": "CLASS-10A"
  }
}
```
*Note: `amount` is always represented in **paise** ($1 \text{ INR} = 100 \text{ paise}$).*

**Razorpay Order Response:**
```json
{
  "id": "order_EKwxwAgItmmXdp",
  "entity": "order",
  "amount": 500000,
  "amount_paid": 0,
  "amount_due": 500000,
  "currency": "INR",
  "receipt": "rcpt_fee_1710319200000",
  "status": "created",
  "attempts": 0,
  "notes": {
    "studentId": "STU-2024-001"
  },
  "created_at": 1710319200
}
```

---

## 5. Signature Verification Formulas

### Payment Verification (Frontend Callback)
```typescript
import crypto from 'crypto';

const generatedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
  .update(`${orderId}|${paymentId}`)
  .digest('hex');

const isValid = crypto.timingSafeEqual(
  Buffer.from(signature, 'hex'),
  Buffer.from(generatedSignature, 'hex')
);
```

### Webhook Signature Verification (`x-razorpay-signature`)
```typescript
import crypto from 'crypto';

const generatedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
  .update(rawBodyString)
  .digest('hex');

const isValid = crypto.timingSafeEqual(
  Buffer.from(signature, 'hex'),
  Buffer.from(generatedSignature, 'hex')
);
```

---

## 6. Next Steps in Phase 2
- **Step 2:** Next.js Server API Routes (`/api/payment/create-order`, `/api/payment/verify-signature`, `/api/payment/webhook`).
- **Step 3:** Student & Parent Portal Checkout Modal (`RazorpayCheckoutModal.tsx`).
- **Step 4:** Transaction Ledger & Status Tracking in Firestore.
- **Step 5:** Automated End-to-End Test Suite.
