import { getAdminStorage } from './firebase-admin';

export interface ReceiptUploadMetadata {
  studentId: string;
  receiptNumber: string;
  paymentId?: string;
  orderId?: string;
  studentName?: string;
  [key: string]: string | undefined;
}

export interface ReceiptUploadResult {
  storagePath: string;
  downloadUrl?: string;
}

/**
 * Sanitizes an ID or receipt number so it is safe to use in storage paths.
 */
export function sanitizeStorageSegment(segment: string): string {
  if (!segment) return 'unknown';
  // Replace slashes, backslashes, colons, or any whitespace with hyphens
  return segment.trim().replace(/[/\\:\s]+/g, '-');
}

/**
 * Generates the standardized storage path for a fee receipt PDF.
 * Format: receipts/{studentId}/{receiptNumber}.pdf
 */
export function getReceiptStoragePath(studentId: string, receiptNumber: string): string {
  const cleanStudentId = sanitizeStorageSegment(studentId);
  const cleanReceiptNumber = sanitizeStorageSegment(receiptNumber);
  return `receipts/${cleanStudentId}/${cleanReceiptNumber}.pdf`;
}

/**
 * Resolves the download / media URL for a stored receipt PDF.
 * Attempts to generate a signed URL (valid for 7 days) if credentials permit,
 * with graceful fallback to the Firebase Storage media URL format.
 */
export async function getReceiptDownloadUrl(storagePath: string): Promise<string> {
  const bucket = getAdminStorage().bucket();
  const file = bucket.file(storagePath);
  const bucketName = bucket.name || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'default-bucket';

  try {
    // Attempt signed URL for secure, authenticated direct access
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    if (signedUrl) return signedUrl;
  } catch (signErr) {
    // Fallback to standard Firebase Storage object URL format
    console.warn('[receipt-storage] Could not generate signed URL, using storage object URL fallback:', signErr);
  }

  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media`;
}

/**
 * Uploads a generated fee receipt PDF Buffer to Firebase Storage using Admin SDK.
 * Attaches metadata for auditing, role-based querying, and security verification.
 * 
 * @param pdfBuffer The generated Node.js PDF Buffer
 * @param studentId The student ID associated with the receipt
 * @param receiptNumber The unique receipt number (e.g. REC-20260913-001)
 * @param metadata Additional metadata for auditing
 * @returns Object with storagePath and downloadUrl
 */
export async function uploadReceiptPDFToStorage(
  pdfBuffer: Buffer,
  studentId: string,
  receiptNumber: string,
  metadata?: Partial<ReceiptUploadMetadata>
): Promise<ReceiptUploadResult> {
  const storagePath = getReceiptStoragePath(studentId, receiptNumber);
  const bucket = getAdminStorage().bucket();
  const file = bucket.file(storagePath);

  const customMetadata: Record<string, string> = {
    studentId,
    receiptNumber,
    generatedAt: new Date().toISOString(),
    contentType: 'application/pdf',
  };

  if (metadata?.paymentId) customMetadata.paymentId = metadata.paymentId;
  if (metadata?.orderId) customMetadata.orderId = metadata.orderId;
  if (metadata?.studentName) customMetadata.studentName = metadata.studentName;

  await file.save(pdfBuffer, {
    contentType: 'application/pdf',
    metadata: {
      metadata: customMetadata,
    },
    resumable: false,
  });

  let downloadUrl: string | undefined;
  try {
    downloadUrl = await getReceiptDownloadUrl(storagePath);
  } catch (urlErr) {
    console.warn('[receipt-storage] Could not retrieve download URL after upload:', urlErr);
  }

  return {
    storagePath,
    downloadUrl,
  };
}
