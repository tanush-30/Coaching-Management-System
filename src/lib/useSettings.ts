'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  SchoolInfoSettings,
  FeeStructureSettings,
  NotificationTemplatesSettings,
  GradingScaleSettings,
  GlobalSettings,
} from './types';
import {
  getSchoolInfoSettings,
  getFeeStructureSettings,
  getNotificationTemplatesSettings,
  getGradingScaleSettings,
  getAllGlobalSettings,
  interpolateTemplate,
  subscribeToSettingsCategory,
} from './settings-service';
import {
  DEFAULT_SCHOOL_INFO,
  DEFAULT_FEE_STRUCTURE,
  DEFAULT_NOTIFICATION_TEMPLATES,
  DEFAULT_GRADING_SCALE,
  DEFAULT_GLOBAL_SETTINGS,
} from './settings-defaults';

export function useSettings() {
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await getAllGlobalSettings();
      setSettings(all);
    } catch (err) {
      console.warn('[useSettings] Error fetching global settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();

    // Subscribe to real-time changes
    const unsubSchool = subscribeToSettingsCategory<SchoolInfoSettings>(
      'schoolInfo',
      DEFAULT_SCHOOL_INFO,
      (data) => setSettings((prev) => ({ ...prev, schoolInfo: data }))
    );

    const unsubFee = subscribeToSettingsCategory<FeeStructureSettings>(
      'feeStructure',
      DEFAULT_FEE_STRUCTURE,
      (data) => setSettings((prev) => ({ ...prev, feeStructure: data }))
    );

    const unsubNotif = subscribeToSettingsCategory<NotificationTemplatesSettings>(
      'notificationTemplates',
      DEFAULT_NOTIFICATION_TEMPLATES,
      (data) => setSettings((prev) => ({ ...prev, notificationTemplates: data }))
    );

    const unsubGrade = subscribeToSettingsCategory<GradingScaleSettings>(
      'gradingScale',
      DEFAULT_GRADING_SCALE,
      (data) => setSettings((prev) => ({ ...prev, gradingScale: data }))
    );

    return () => {
      unsubSchool();
      unsubFee();
      unsubNotif();
      unsubGrade();
    };
  }, [loadSettings]);

  /**
   * Helper to format a notification template with variables
   */
  const formatTemplate = useCallback(
    (
      templateKey: keyof NotificationTemplatesSettings['templates'],
      variables: Record<string, string | number | undefined | null>
    ): string => {
      const tpl = settings.notificationTemplates.templates[templateKey];
      if (!tpl) return '';
      return interpolateTemplate(tpl.bodyTemplate, {
        schoolName: settings.schoolInfo.institutionName,
        schoolPhone: settings.schoolInfo.phone,
        currencySymbol: settings.schoolInfo.currencySymbol,
        ...variables,
      });
    },
    [settings]
  );

  /**
   * Helper to compute letter grade and remarks based on percentage
   */
  const calculateGrade = useCallback(
    (percentage: number): { grade: string; remarks: string; gpaPoint: number; colorHex: string } => {
      const grades = settings.gradingScale.grades;
      const matched = grades.find((g) => percentage >= g.minScore && percentage <= g.maxScore);

      if (matched) {
        return {
          grade: matched.grade,
          remarks: matched.remarks,
          gpaPoint: matched.gpaPoint,
          colorHex: matched.colorHex,
        };
      }

      // Default fallback if boundary edge case
      return percentage >= settings.gradingScale.passingPercentage
        ? { grade: 'Pass', remarks: 'Meets minimum criteria', gpaPoint: 5.0, colorHex: '#10b981' }
        : { grade: settings.gradingScale.passingGrade || 'F', remarks: 'Needs Improvement', gpaPoint: 0.0, colorHex: '#ef4444' };
    },
    [settings]
  );

  return {
    schoolInfo: settings.schoolInfo,
    feeStructure: settings.feeStructure,
    notificationTemplates: settings.notificationTemplates,
    gradingScale: settings.gradingScale,
    isLoading,
    reload: loadSettings,
    formatTemplate,
    calculateGrade,
  };
}
