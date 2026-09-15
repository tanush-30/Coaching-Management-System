import {
  CalendarCheck,
  FileText,
  BookOpen,
  Award,
  Calendar,
  Users,
  RefreshCw,
  LayoutDashboard,
  Receipt,
  User,
  TrendingUp,
  Megaphone,
  Wallet,
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

export interface NavSectionConfig {
  sectionTitle: string;
  items: NavItemConfig[];
}

export const PORTAL_NAV_SECTIONS: Record<PortalRole, NavSectionConfig[]> = {
  student: [
    {
      sectionTitle: 'MY ACCOUNT',
      items: [
        {
          id: 'profile',
          label: 'My Student Profile',
          icon: User,
          roles: ['student'],
          description: 'Official student record, batch enrollment & guardian info',
        },
        {
          id: 'announcements',
          label: 'Announcements & Notices',
          icon: Megaphone,
          roles: ['student'],
          description: 'Official institute broadcasts and batch updates',
        },
      ],
    },
    {
      sectionTitle: 'ACADEMICS & SCHEDULE',
      items: [
        {
          id: 'attendance',
          label: 'Attendance & Presence',
          icon: CalendarCheck,
          roles: ['student'],
          description: 'Monthly attendance, presence rates & official records',
        },
        {
          id: 'schedule',
          label: 'Class Timetable',
          icon: Calendar,
          roles: ['student'],
          description: 'Weekly schedule, smart lab slots & timing',
        },
        {
          id: 'homework',
          label: 'Homework & DPPs',
          icon: FileText,
          roles: ['student'],
          description: 'Daily assignments, submissions & due dates',
        },
      ],
    },
    {
      sectionTitle: 'STUDY & PERFORMANCE',
      items: [
        {
          id: 'progress',
          label: 'Academic Progress & Index',
          icon: TrendingUp,
          roles: ['student'],
          description: 'Consolidated performance index, attendance & homework trends',
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
      ],
    },
    {
      sectionTitle: 'FINANCES & BILLING',
      items: [
        {
          id: 'receipts',
          label: 'Fee Receipts & Ledger',
          icon: Receipt,
          roles: ['student'],
          description: 'Payment history, settled ledger & official PDF receipts',
        },
      ],
    },
  ],
  faculty: [
    {
      sectionTitle: 'MY ACCOUNT',
      items: [
        {
          id: 'profile',
          label: 'My Faculty Profile',
          icon: User,
          roles: ['faculty'],
          description: 'Teacher bio, subjects, workload & contact details',
        },
        {
          id: 'announcements',
          label: 'Announcements & Notices',
          icon: Megaphone,
          roles: ['faculty'],
          description: 'Institute broadcasts, faculty updates & batch notices',
        },
      ],
    },
    {
      sectionTitle: 'CLASSROOM OPERATIONS',
      items: [
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
          id: 'homework',
          label: 'Assignments & Homework',
          icon: FileText,
          roles: ['faculty'],
          description: 'Create, distribute & track student submissions',
        },
        {
          id: 'materials',
          label: 'Study Materials & Notes',
          icon: BookOpen,
          roles: ['faculty'],
          description: 'Upload handouts, chapter notes & formula sheets',
        },
      ],
    },
    {
      sectionTitle: 'ACADEMIC GRADING',
      items: [
        {
          id: 'progress',
          label: 'Student Progress & At-Risk',
          icon: TrendingUp,
          roles: ['faculty'],
          description: 'Batch academic index, at-risk early warnings & student drill-downs',
        },
        {
          id: 'academics',
          label: 'Test Marks & Reports',
          icon: Award,
          roles: ['faculty'],
          description: 'Create unit tests, grade students & issue PDF scorecards',
        },
        {
          id: 'substitute',
          label: 'Substitute Requests',
          icon: RefreshCw,
          roles: ['faculty'],
          description: 'Slot swaps and peer coverage approvals',
        },
      ],
    },
    {
      sectionTitle: 'STUDENT DIRECTORY',
      items: [
        {
          id: 'roster',
          label: 'Student Roster & Batches',
          icon: Users,
          roles: ['faculty'],
          description: 'Batch directory and emergency guardian contacts',
        },
      ],
    },
    {
      sectionTitle: 'COMPENSATION & FINANCES',
      items: [
        {
          id: 'payroll',
          label: 'My Salary & Payslips',
          icon: Wallet,
          roles: ['faculty'],
          description: 'Monthly salary breakdown, payout history & official payslip PDFs',
        },
      ],
    },
  ],
};

export const PORTAL_NAV_ITEMS: Record<PortalRole, NavItemConfig[]> = {
  student: PORTAL_NAV_SECTIONS.student.flatMap((s) => s.items),
  faculty: PORTAL_NAV_SECTIONS.faculty.flatMap((s) => s.items),
};
