import React from 'react';
import {
  CalendarCheck,
  FileText,
  BookOpen,
  Award,
  Calendar,
  Users,
  RefreshCw,
  LayoutDashboard,
  LucideIcon,
} from 'lucide-react';

export type PortalRole = 'faculty' | 'student';

export interface NavItemConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  roles: PortalRole[];
  badge?: string;
  description?: string;
}

export const PORTAL_NAV_ITEMS: Record<PortalRole, NavItemConfig[]> = {
  student: [
    {
      id: 'attendance',
      label: 'Attendance & Presence',
      icon: CalendarCheck,
      roles: ['student'],
      description: 'Monthly attendance, presence rates & official records',
    },
    {
      id: 'homework',
      label: 'Homework & Tasks',
      icon: FileText,
      roles: ['student'],
      description: 'Daily assignments, submissions & due dates',
    },
    {
      id: 'materials',
      label: 'Study Notes & Sheets',
      icon: BookOpen,
      roles: ['student'],
      description: 'Chapter notes, formula guides & lecture materials',
    },
    {
      id: 'results',
      label: 'Exam Results & Ranks',
      icon: Award,
      roles: ['student'],
      description: 'Scorecards, rank analysis & performance trends',
    },
    {
      id: 'schedule',
      label: 'Class Timetable',
      icon: Calendar,
      roles: ['student'],
      description: 'Weekly schedule, smart lab slots & timing',
    },
  ],
  faculty: [
    {
      id: 'schedule',
      label: 'My Schedule & Classes',
      icon: Calendar,
      roles: ['faculty'],
      description: 'Weekly lecture timetable and room assignments',
    },
    {
      id: 'attendance',
      label: 'Mark Batch Attendance',
      icon: CalendarCheck,
      roles: ['faculty'],
      description: '15-second fast attendance grid and session history',
    },
    {
      id: 'academics',
      label: 'Test Marks & Report Cards',
      icon: Award,
      roles: ['faculty'],
      description: 'Create unit tests, grade students & issue PDF scorecards',
    },
    {
      id: 'homework',
      label: 'Assignments & Homework',
      icon: FileText,
      roles: ['faculty'],
      description: 'Create, distribute & track student submissions',
    },
    {
      id: 'substitute',
      label: 'Substitute Requests',
      icon: RefreshCw,
      roles: ['faculty'],
      description: 'Slot swaps and peer coverage approvals',
    },
    {
      id: 'roster',
      label: 'Student Roster',
      icon: Users,
      roles: ['faculty'],
      description: 'Batch directory and emergency guardian contacts',
    },
  ],
};
