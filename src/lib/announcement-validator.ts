/**
 * Announcement Schema Validator & Sanitizer
 * 
 * Implements validation rules for Phase 9 Announcements:
 * 1. Title must be non-empty (minimum 3 characters).
 * 2. Message must be non-empty (minimum 5 characters).
 * 3. audienceType must be one of 'all', 'batch', 'individual'.
 * 4. If audienceType is 'batch' or 'individual', audienceIds must have at least 1 ID.
 * 5. If audienceType is 'all', audienceIds is normalized to an empty array.
 * 6. channels must contain at least 1 valid channel ('in-app', 'whatsapp', 'email').
 * 7. status must be one of 'draft', 'sent', 'failed'.
 * 8. senderId must be provided.
 */

import {
  Announcement,
  AnnouncementAudienceType,
  AnnouncementChannel,
  AnnouncementPriority,
  AnnouncementStatus,
} from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: Announcement;
}

const VALID_AUDIENCE_TYPES: AnnouncementAudienceType[] = ['all', 'batch', 'individual'];
const VALID_CHANNELS: AnnouncementChannel[] = ['in-app', 'whatsapp', 'email'];
const VALID_STATUSES: AnnouncementStatus[] = ['draft', 'sent', 'failed'];
const VALID_PRIORITIES: AnnouncementPriority[] = ['normal', 'urgent', 'pinned'];

export function validateAnnouncement(input: Partial<Announcement>): ValidationResult {
  const errors: string[] = [];

  // 1. Title validation
  const title = (input.title || '').trim();
  if (!title) {
    errors.push('Announcement title is required.');
  } else if (title.length < 3) {
    errors.push('Announcement title must be at least 3 characters.');
  } else if (title.length > 200) {
    errors.push('Announcement title cannot exceed 200 characters.');
  }

  // 2. Message body validation
  const message = (input.message || '').trim();
  if (!message) {
    errors.push('Announcement message body is required.');
  } else if (message.length < 5) {
    errors.push('Announcement message body must be at least 5 characters.');
  }

  // 3. Sender validation
  const senderId = (input.senderId || input.sender_id || '').trim();
  if (!senderId) {
    errors.push('Sender ID is required.');
  }

  // 4. Audience Type validation
  const audienceType = (input.audienceType || input.audience_type || 'all') as AnnouncementAudienceType;
  if (!VALID_AUDIENCE_TYPES.includes(audienceType)) {
    errors.push(`Invalid audience type "${audienceType}". Must be one of: ${VALID_AUDIENCE_TYPES.join(', ')}.`);
  }

  // 5. Audience IDs validation
  let audienceIds = input.audienceIds || input.audience_ids || [];
  if (!Array.isArray(audienceIds)) {
    audienceIds = [];
  }
  audienceIds = audienceIds.map((id) => String(id).trim()).filter(Boolean);

  if (audienceType === 'batch' && audienceIds.length === 0) {
    errors.push('At least one Batch ID must be selected when audience type is "batch".');
  } else if (audienceType === 'individual' && audienceIds.length === 0) {
    errors.push('At least one Student / Faculty / Parent ID must be specified when audience type is "individual".');
  } else if (audienceType === 'all') {
    // Normalization: all audience type must have empty audienceIds
    audienceIds = [];
  }

  // 6. Channels validation
  let channels = input.channels || [];
  if (!Array.isArray(channels)) {
    channels = [];
  }
  const filteredChannels = channels.filter((c) => VALID_CHANNELS.includes(c));
  if (filteredChannels.length === 0) {
    errors.push('At least one delivery channel ("in-app", "whatsapp", "email") must be selected.');
  }

  // 7. Status validation
  const status = (input.status || 'draft') as AnnouncementStatus;
  if (!VALID_STATUSES.includes(status)) {
    errors.push(`Invalid status "${status}". Must be one of: ${VALID_STATUSES.join(', ')}.`);
  }

  // 8. Priority validation
  const priority = (input.priority || 'normal') as AnnouncementPriority;
  if (!VALID_PRIORITIES.includes(priority)) {
    errors.push(`Invalid priority "${priority}". Must be one of: ${VALID_PRIORITIES.join(', ')}.`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const nowISO = new Date().toISOString();
  const id = input.id || `ann-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const sanitized: Announcement = {
    id,
    title,
    message,
    audienceType,
    audienceIds,
    channels: filteredChannels,
    senderId,
    senderName: input.senderName || 'Administration',
    senderRole: input.senderRole || 'admin',
    status,
    priority,
    templateId: input.templateId ?? null,
    batchNames: input.batchNames || [],
    targetRoles: input.targetRoles || ['student', 'teacher', 'parent'],
    createdAt: input.createdAt || input.created_at || nowISO,
    sentAt: status === 'sent' ? input.sentAt || input.sent_at || nowISO : null,
    updatedAt: nowISO,
    // Provide aliases
    audience_type: audienceType,
    audience_ids: audienceIds,
    sender_id: senderId,
    created_at: input.createdAt || input.created_at || nowISO,
    sent_at: status === 'sent' ? input.sentAt || input.sent_at || nowISO : null,
  };

  return {
    valid: true,
    errors: [],
    sanitized,
  };
}
