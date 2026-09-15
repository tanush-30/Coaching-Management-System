// Storage Upload Utility — Decoupled upload engine with live progress & validation
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getClientStorage, isFirebaseConfigured } from './firebase';

export interface UploadResult {
  downloadUrl: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface UploadOptions {
  maxFileSizeMB?: number;
  acceptedFileTypes?: string[];
  onProgress?: (progress: number, bytesTransferred: number, totalBytes: number) => void;
  metadata?: Record<string, string>;
}

export const DEFAULT_ACCEPTED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.txt',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.zip',
];

export const DEFAULT_MAX_FILE_SIZE_MB = 50;

/**
 * Sanitizes file names to prevent directory traversal or URL encoding issues
 */
export function sanitizeStorageFileName(originalName: string): string {
  const extension = originalName.lastIndexOf('.') !== -1 ? originalName.slice(originalName.lastIndexOf('.')) : '';
  const baseName = originalName.slice(0, originalName.length - extension.length);
  const cleanBase = baseName
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80);
  const timestamp = Date.now();
  return `${cleanBase}_${timestamp}${extension.toLowerCase()}`;
}

/**
 * Validates a file against extension and size constraints
 */
export function validateFile(
  file: File,
  options?: Pick<UploadOptions, 'maxFileSizeMB' | 'acceptedFileTypes'>
): { valid: boolean; error?: string } {
  const maxBytes = (options?.maxFileSizeMB || DEFAULT_MAX_FILE_SIZE_MB) * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum limit of ${
        options?.maxFileSizeMB || DEFAULT_MAX_FILE_SIZE_MB
      } MB.`,
    };
  }

  const allowedTypes = options?.acceptedFileTypes || DEFAULT_ACCEPTED_EXTENSIONS;
  const fileNameLower = file.name.toLowerCase();
  const fileMime = file.type.toLowerCase();

  const isExtensionValid = allowedTypes.some((ext) => {
    if (ext.startsWith('.')) {
      return fileNameLower.endsWith(ext.toLowerCase());
    }
    // MIME type check
    return fileMime.includes(ext.toLowerCase());
  });

  if (!isExtensionValid && allowedTypes.length > 0) {
    return {
      valid: false,
      error: `Unsupported file type "${file.name.slice(file.name.lastIndexOf('.'))}". Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Uploads a file to Cloud Storage with live progress monitoring.
 * Uses the Next.js /api/upload endpoint powered by Firebase Admin SDK to bypass
 * browser CORS preflight blocks and client storage rule restrictions.
 */
export async function uploadFileToStorage(
  file: File,
  targetStoragePath: string,
  options?: UploadOptions
): Promise<UploadResult> {
  const validation = validateFile(file, options);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file.');
  }

  // Upload via /api/upload with XMLHttpRequest to track live upload progress
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('storagePath', targetStoragePath);
      if (options?.metadata) {
        formData.append('metadata', JSON.stringify(options.metadata));
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && options?.onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          options.onProgress(progress, event.loaded, event.total);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.downloadUrl) {
              if (options?.onProgress) {
                options.onProgress(100, file.size, file.size);
              }
              resolve({
                downloadUrl: data.downloadUrl,
                storagePath: data.storagePath || targetStoragePath,
                fileName: data.fileName || file.name,
                fileSize: data.fileSize || file.size,
                fileType: data.fileType || file.type || 'application/octet-stream',
              });
              return;
            }
          } catch (jsonErr) {
            console.error('[StorageUpload] Parse error:', jsonErr);
          }
        }

        // If server responded with error JSON
        let serverErrorMsg = 'Failed to upload file.';
        try {
          const errData = JSON.parse(xhr.responseText);
          if (errData.error) serverErrorMsg = errData.error;
        } catch {
          if (xhr.statusText) serverErrorMsg = `Upload error (${xhr.status}: ${xhr.statusText})`;
        }
        reject(new Error(serverErrorMsg));
      };

      xhr.onerror = () => {
        // Fallback: If client SDK is available and configured, attempt client-side fallback
        if (isFirebaseConfigured) {
          try {
            const storage = getClientStorage();
            const storageRef = ref(storage, targetStoragePath);
            const uploadTask = uploadBytesResumable(storageRef, file, {
              contentType: file.type || 'application/octet-stream',
              customMetadata: {
                originalName: file.name,
                uploadedAt: new Date().toISOString(),
                ...(options?.metadata || {}),
              },
            });

            uploadTask.on(
              'state_changed',
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (options?.onProgress) {
                  options.onProgress(progress, snapshot.bytesTransferred, snapshot.totalBytes);
                }
              },
              (error) => {
                reject(new Error(`Upload failed: ${error.message}`));
              },
              async () => {
                try {
                  const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                  resolve({
                    downloadUrl,
                    storagePath: targetStoragePath,
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type || 'application/octet-stream',
                  });
                } catch (urlErr: any) {
                  reject(new Error(urlErr.message || 'Failed to retrieve uploaded file URL.'));
                }
              }
            );
            return;
          } catch (clientErr) {
            console.error('[StorageUpload] Client upload fallback failed:', clientErr);
          }
        }

        reject(new Error('Network error: Could not reach the file upload server. Please check your connection.'));
      };

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    } catch (err: any) {
      reject(new Error(err?.message || 'Failed to start upload.'));
    }
  });
}
