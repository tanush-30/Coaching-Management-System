// Settings Service — Cloud Firestore Read/Write operations for ApexERP global settings
// Supports categorized document CRUD, offline localStorage caching, real-time sync, and variable interpolation

import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  Unsubscribe,
  DocumentData,
} from 'firebase/firestore';
import { getClientDb, isFirebaseConfigured } from './firebase';
import { cleanFirestoreData, FirestoreServiceError } from './firestore-service';
import {
  SchoolInfoSettings,
  FeeStructureSettings,
  NotificationTemplatesSettings,
  GradingScaleSettings,
  GlobalSettings,
} from './types';
import { logAuditEvent } from './audit-service';
import {
  DEFAULT_SCHOOL_INFO,
  DEFAULT_FEE_STRUCTURE,
  DEFAULT_NOTIFICATION_TEMPLATES,
  DEFAULT_GRADING_SCALE,
  DEFAULT_GLOBAL_SETTINGS,
} from './settings-defaults';

const SETTINGS_COLLECTION = 'settings';
const STORAGE_PREFIX = 'apex_erp_settings_';

export type SettingsCategoryKey = 'schoolInfo' | 'feeStructure' | 'notificationTemplates' | 'gradingScale';

/**
 * LocalStorage sync helper for instant local reads and offline resilience
 */
function getLocalCached<T>(category: SettingsCategoryKey, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${category}`);
    if (raw) {
      return { ...fallback, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn(`[SettingsService] Failed to read local cache for ${category}:`, err);
  }
  return fallback;
}

function setLocalCached<T>(category: SettingsCategoryKey, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${category}`, JSON.stringify(data));
  } catch (err) {
    console.warn(`[SettingsService] Failed to write local cache for ${category}:`, err);
  }
}

/**
 * Reads a settings category document from Firestore with fallback to localStorage & defaults
 */
export async function getSettingsCategory<T extends { id: string }>(
  category: SettingsCategoryKey,
  defaultData: T
): Promise<T> {
  const localVal = getLocalCached<T>(category, defaultData);

  if (!isFirebaseConfigured) {
    return localVal;
  }

  try {
    const db = getClientDb();
    const docRef = doc(db, SETTINGS_COLLECTION, category);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const remoteData = { id: snap.id, ...snap.data() } as T;
      setLocalCached(category, remoteData);
      return remoteData;
    } else {
      // Initialize Firestore document with default seed if missing
      await setDoc(docRef, cleanFirestoreData(defaultData));
      setLocalCached(category, defaultData);
      return defaultData;
    }
  } catch (err: unknown) {
    console.warn(`[SettingsService] Error loading ${category} from Firestore, using local cache:`, err);
    return localVal;
  }
}

import {
  validateSchoolInfo,
  validateFeeStructure,
  validateNotificationTemplates,
  validateGradingScale,
  ValidationResult,
} from './settings-validator';

/**
 * Validates a category payload and returns result
 */
export function validateSettingsCategoryPayload(
  category: SettingsCategoryKey,
  data: any
): ValidationResult {
  switch (category) {
    case 'schoolInfo':
      return validateSchoolInfo(data);
    case 'feeStructure':
      return validateFeeStructure(data);
    case 'notificationTemplates':
      return validateNotificationTemplates(data);
    case 'gradingScale':
      return validateGradingScale(data);
    default:
      return { isValid: true, errors: [] };
  }
}

/**
 * Lightweight client logger for recording validation rejections
 */
export function logValidationFailure(category: string, errors: any[]) {
  console.warn(`[SettingsValidation] Attempted invalid settings save for "${category}":`, errors);
  if (typeof window !== 'undefined') {
    try {
      const logs = JSON.parse(localStorage.getItem('apex_erp_validation_errors') || '[]');
      logs.unshift({
        category,
        errors,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('apex_erp_validation_errors', JSON.stringify(logs.slice(0, 50)));
    } catch {}
  }
}

/**
 * Writes updated settings to Firestore & localStorage, updating audit fields (updatedAt, updatedBy, version)
 */
export async function saveSettingsCategory<T extends { id: string; version?: number }>(
  category: SettingsCategoryKey,
  data: Partial<T>,
  updatedBy: string = 'admin'
): Promise<T> {
  const current = getLocalCached<T>(category, data as T);

  // Validate merged candidate data
  const candidate = { ...current, ...data };
  const validation = validateSettingsCategoryPayload(category, candidate);

  if (!validation.isValid) {
    logValidationFailure(category, validation.errors);
    const errorMsg = validation.errors.map((e) => e.message).join(' | ');
    throw new FirestoreServiceError(`Validation failed: ${errorMsg}`, 'validation_error');
  }

  const nextVersion = (current.version || 0) + 1;

  const payload = {
    ...current,
    ...data,
    id: category,
    updatedAt: new Date().toISOString(),
    updatedBy,
    version: nextVersion,
  } as T;

  setLocalCached(category, payload);

  if (!isFirebaseConfigured) {
    await logAuditEvent({
      actorId: updatedBy || 'admin-session',
      actorEmail: `${updatedBy}@apexacademy.edu`,
      actorRole: 'admin',
      action: 'SETTINGS_UPDATE',
      targetType: 'settings',
      targetId: category,
      targetName: `Institute Settings (${category})`,
      before: current,
      after: payload,
      metadata: { category, version: nextVersion },
    });
    return payload;
  }

  try {
    const db = getClientDb();
    const docRef = doc(db, SETTINGS_COLLECTION, category);
    const cleanData = cleanFirestoreData(payload);
    await setDoc(docRef, cleanData, { merge: true });
    await logAuditEvent({
      actorId: updatedBy || 'admin-session',
      actorEmail: `${updatedBy}@apexacademy.edu`,
      actorRole: 'admin',
      action: 'SETTINGS_UPDATE',
      targetType: 'settings',
      targetId: category,
      targetName: `Institute Settings (${category})`,
      before: current,
      after: payload,
      metadata: { category, version: nextVersion },
    });
    return payload;
  } catch (err: unknown) {
    console.error(`[SettingsService] Error saving ${category} to Firestore:`, err);
    throw new FirestoreServiceError(
      `Failed to save settings for ${category}: ${err instanceof Error ? err.message : String(err)}`,
      'settings_save_failed',
      err
    );
  }
}

/**
 * Real-time listener for a settings document category
 */
export function subscribeToSettingsCategory<T extends { id: string }>(
  category: SettingsCategoryKey,
  fallback: T,
  onData: (data: T) => void,
  onError?: (err: FirestoreServiceError) => void
): Unsubscribe {
  // Emit local cache immediately
  onData(getLocalCached(category, fallback));

  if (!isFirebaseConfigured) {
    return () => {};
  }

  try {
    const db = getClientDb();
    const docRef = doc(db, SETTINGS_COLLECTION, category);

    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const remoteData = { id: snap.id, ...snap.data() } as T;
          setLocalCached(category, remoteData);
          onData(remoteData);
        } else {
          onData(fallback);
        }
      },
      (err) => {
        const error = new FirestoreServiceError(`Failed to listen to settings/${category}: ${err.message}`, err.code, err);
        console.error(`[SettingsService] Subscription error on settings/${category}:`, error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.warn(`[SettingsService] Could not establish listener for settings/${category}:`, err);
    return () => {};
  }
}

// ==========================================
// Category-Specific High-Level Accessors
// ==========================================

export const getSchoolInfoSettings = () => getSettingsCategory<SchoolInfoSettings>('schoolInfo', DEFAULT_SCHOOL_INFO);
export const saveSchoolInfoSettings = (data: Partial<SchoolInfoSettings>, actor: string) =>
  saveSettingsCategory<SchoolInfoSettings>('schoolInfo', data, actor);

export const getFeeStructureSettings = () => getSettingsCategory<FeeStructureSettings>('feeStructure', DEFAULT_FEE_STRUCTURE);
export const saveFeeStructureSettings = (data: Partial<FeeStructureSettings>, actor: string) =>
  saveSettingsCategory<FeeStructureSettings>('feeStructure', data, actor);

export const getNotificationTemplatesSettings = () =>
  getSettingsCategory<NotificationTemplatesSettings>('notificationTemplates', DEFAULT_NOTIFICATION_TEMPLATES);
export const saveNotificationTemplatesSettings = (data: Partial<NotificationTemplatesSettings>, actor: string) =>
  saveSettingsCategory<NotificationTemplatesSettings>('notificationTemplates', data, actor);

export const getGradingScaleSettings = () => getSettingsCategory<GradingScaleSettings>('gradingScale', DEFAULT_GRADING_SCALE);
export const saveGradingScaleSettings = (data: Partial<GradingScaleSettings>, actor: string) =>
  saveSettingsCategory<GradingScaleSettings>('gradingScale', data, actor);

export async function getAllGlobalSettings(): Promise<GlobalSettings> {
  const [schoolInfo, feeStructure, notificationTemplates, gradingScale] = await Promise.all([
    getSchoolInfoSettings(),
    getFeeStructureSettings(),
    getNotificationTemplatesSettings(),
    getGradingScaleSettings(),
  ]);

  return {
    schoolInfo,
    feeStructure,
    notificationTemplates,
    gradingScale,
  };
}

// ==========================================
// Utility: Template Variable Interpolation
// ==========================================

/**
 * Replaces {{variable}} placeholders in a message template with values from variables record.
 * Example: interpolateTemplate("Hello {{studentName}}", { studentName: "John" }) => "Hello John"
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string | number | undefined | null>
): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    const val = variables[key];
    return val !== undefined && val !== null ? String(val) : match;
  });
}
