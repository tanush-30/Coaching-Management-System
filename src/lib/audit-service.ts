// Audit Service — Captures administrative edits and security events in Cloud Firestore
// Records diffs (old value -> new value), actor identity, target role/ID, and timestamp.

import { doc, setDoc, collection } from 'firebase/firestore';
import { getClientDb, isFirebaseConfigured } from './firebase';
import { cleanFirestoreData } from './firestore-service';
import type { UserRole, AuditActionType, AuditTargetType, AuditFieldDiff, AuditLogEntry } from './types';

export type { AuditActionType, AuditTargetType, AuditFieldDiff, AuditLogEntry };

export interface AdminEditAuditPayload {
  actorUid?: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: UserRole | 'admin' | string;
  targetId: string;
  targetRole?: AuditTargetType | string;
  targetType?: AuditTargetType | string;
  targetName: string;
  before: Record<string, any>;
  after: Record<string, any>;
  action?: AuditActionType | string;
  metadata?: Record<string, any> | null;
}

export interface FieldDiff extends AuditFieldDiff {}

export interface ComputedAuditLog extends AuditLogEntry {
  id: string;
  actorUid: string;
  actorEmail?: string;
  actorRole: string;
  targetId: string;
  targetRole: AuditTargetType | string;
  targetName: string;
  action: string;
  changes: Record<string, FieldDiff>;
  timestamp: string;
}

/**
 * Calculates a field-by-field diff between old and new state objects.
 * Ignores unchanged fields and internal bookkeeping fields.
 */
export function calculateFieldDiff(
  before: Record<string, any>,
  after: Record<string, any>,
  ignoredKeys: string[] = ['id', 'updatedAt', 'avatar']
): Record<string, FieldDiff> {
  const diff: Record<string, FieldDiff> = {};
  const allKeys = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]));

  for (const key of allKeys) {
    if (ignoredKeys.includes(key)) continue;

    const oldVal = before?.[key];
    const newVal = after?.[key];

    // Check array equality
    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      const isSame = oldVal.length === newVal.length && oldVal.every((val, idx) => val === newVal[idx]);
      if (!isSame) {
        diff[key] = { old: oldVal, new: newVal };
      }
      continue;
    }

    // Check primitive/object equality
    if (oldVal !== newVal) {
      diff[key] = {
        old: oldVal !== undefined ? oldVal : null,
        new: newVal !== undefined ? newVal : null,
      };
    }
  }

  return diff;
}

/**
 * Persists an admin edit event to the Firestore `audit_logs` collection.
 */
export async function logAdminEdit(payload: AdminEditAuditPayload): Promise<ComputedAuditLog | null> {
  const changes = calculateFieldDiff(payload.before, payload.after);

  // If nothing actually changed, skip writing redundant logs
  if (Object.keys(changes).length === 0) {
    return null;
  }

  const logId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const targetCategory = payload.targetType || payload.targetRole || 'student';
  const logEntry: ComputedAuditLog = {
    id: logId,
    actorId: payload.actorId || payload.actorUid || 'admin-session',
    actorUid: payload.actorUid || payload.actorId || 'admin-session',
    actorEmail: payload.actorEmail || 'admin@apexacademy.edu',
    actorRole: payload.actorRole || 'admin',
    targetId: payload.targetId,
    targetType: targetCategory,
    targetRole: targetCategory,
    targetName: payload.targetName,
    action: payload.action || `admin_edit_${targetCategory}`,
    before: payload.before,
    after: payload.after,
    changes,
    metadata: payload.metadata || null,
    timestamp: new Date().toISOString(),
  };

  if (!isFirebaseConfigured) {
    console.log('[AuditService] Local edit logged:', logEntry);
    return logEntry;
  }

  try {
    const db = getClientDb();
    const docRef = doc(collection(db, 'audit_logs'), logId);
    await setDoc(docRef, cleanFirestoreData(logEntry));
    return logEntry;
  } catch (err) {
    console.warn('[AuditService] Failed to write audit log to Firestore:', err);
    return logEntry;
  }
}

/**
 * Centralized helper to log any system or administrative audit event.
 */
export interface LogAuditEventParams {
  actorId?: string;
  actorUid?: string;
  actorEmail?: string;
  actorRole?: UserRole | 'admin' | string;
  action: AuditActionType | string;
  targetType: AuditTargetType | string;
  targetId: string;
  targetName?: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
}

export async function logAuditEvent(params: LogAuditEventParams): Promise<ComputedAuditLog | null> {
  const changes =
    params.before && params.after ? calculateFieldDiff(params.before, params.after) : {};
  const logId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const logEntry: ComputedAuditLog = {
    id: logId,
    actorId: params.actorId || params.actorUid || 'admin-session',
    actorUid: params.actorUid || params.actorId || 'admin-session',
    actorEmail: params.actorEmail || 'admin@apexacademy.edu',
    actorRole: params.actorRole || 'admin',
    targetId: params.targetId,
    targetType: params.targetType,
    targetRole: params.targetType,
    targetName: params.targetName || params.targetId,
    action: params.action,
    before: params.before || null,
    after: params.after || null,
    changes,
    metadata: params.metadata || null,
    timestamp: new Date().toISOString(),
  };

  if (!isFirebaseConfigured) {
    return logEntry;
  }

  try {
    const db = getClientDb();
    const docRef = doc(collection(db, 'audit_logs'), logId);
    await setDoc(docRef, cleanFirestoreData(logEntry));
    return logEntry;
  } catch (err) {
    console.warn('[AuditService] Failed to write audit log to Firestore:', err);
    return logEntry;
  }
}

