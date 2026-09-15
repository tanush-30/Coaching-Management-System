import Razorpay from 'razorpay';
import crypto from 'crypto';

export interface CreateOrderParams {
  amount: number; // In paise (e.g. 100000 = ₹1000.00)
  currency?: string; // Default 'INR'
  receipt: string; // e.g. "rcpt_1710319200000" or fee payment ID
  notes?: Record<string, string>; // Metadata: studentId, studentName, month, classId
}

export interface RazorpayOrderResponse {
  id: string; // "order_XXXXX"
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: 'created' | 'attempted' | 'paid';
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

export interface PaymentVerificationParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface WebhookVerificationParams {
  rawBody: string;
  signature: string;
  webhookSecret?: string;
}

/**
 * Checks if Razorpay server and public keys are defined in environment variables.
 */
export function isRazorpayConfigured(): boolean {
  return Boolean(
    (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID) &&
    process.env.RAZORPAY_KEY_SECRET
  );
}

/**
 * Detects whether the active Razorpay key is in test mode, live mode, or unconfigured.
 */
export function getRazorpayKeyMode(): 'test' | 'live' | 'unconfigured' {
  const keyId = (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '').trim();
  if (!keyId) return 'unconfigured';
  if (keyId.startsWith('rzp_test_')) return 'test';
  if (keyId.startsWith('rzp_live_')) return 'live';
  return 'test'; // Fallback safe assumption for custom test key strings
}

/**
 * Sanitizes and truncates a receipt ID to comply with Razorpay's <= 40 character limit.
 * Razorpay API throws BAD_REQUEST_ERROR if receipt exceeds 40 chars.
 */
export function sanitizeReceiptId(receipt: string): string {
  if (!receipt) return `rcpt_${Date.now()}`;
  const clean = receipt.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (clean.length <= 40) return clean;
  
  const hash = crypto.createHash('md5').update(clean).digest('hex').slice(0, 8);
  return `${clean.slice(0, 31)}_${hash}`;
}

/**
 * Formats an amount in INR rupees to integer paise (e.g. 500.50 -> 50050).
 * Prevents fractional floating-point values from causing order creation rejection.
 */
export function formatPaiseAmount(amountInRupees: number): number {
  if (typeof amountInRupees !== 'number' || isNaN(amountInRupees) || amountInRupees <= 0) {
    throw new Error(`Invalid fee amount: ${amountInRupees}. Amount must be a positive number.`);
  }
  return Math.round(amountInRupees * 100);
}

/**
 * Returns a configured Razorpay SDK instance.
 * Server-side only — throws if API keys are missing.
 */
export function getRazorpayInstance(): Razorpay {
  const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error(
      'Razorpay credentials are not configured. Please set NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local.'
    );
  }

  return new Razorpay({
    key_id,
    key_secret,
  });
}

/**
 * Cryptographically verifies the Razorpay payment signature returned by the client-side checkout modal.
 * Formula: HMAC_SHA256(order_id + "|" + razorpay_payment_id, secret) == razorpay_signature
 */
export function verifyRazorpaySignature({
  orderId,
  paymentId,
  signature,
}: PaymentVerificationParams): boolean {
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_secret || !orderId || !paymentId || !signature) {
    return false;
  }

  try {
    const generatedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // Constant-time string comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'hex');
    const genBuffer = Buffer.from(generatedSignature, 'hex');

    if (sigBuffer.length !== genBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, genBuffer);
  } catch {
    return false;
  }
}

/**
 * Cryptographically verifies Razorpay webhook payload signature from the `x-razorpay-signature` header.
 * Formula: HMAC_SHA256(rawRequestBody, webhookSecret) == x-razorpay-signature
 */
export function verifyWebhookSignature({
  rawBody,
  signature,
  webhookSecret,
}: WebhookVerificationParams): boolean {
  const secret = webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !rawBody || !signature) {
    return false;
  }

  try {
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const genBuffer = Buffer.from(generatedSignature, 'hex');

    if (sigBuffer.length !== genBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, genBuffer);
  } catch {
    return false;
  }
}
