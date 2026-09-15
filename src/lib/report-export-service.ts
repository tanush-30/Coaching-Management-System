/**
 * Phase 10: Reports & Exports Module — Export Functionality (CSV & PDF Engine)
 * 
 * Converts aggregated report results from Step 2 into:
 * 1. RFC-4180 compliant CSV files with UTF-8 BOM encoding for Microsoft Excel & Google Sheets.
 * 2. Institutional branded PDF reports using jsPDF + jspdf-autotable.
 */

import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { GeneratedReportResult } from './report-aggregation-service';
import { SchoolInfoSettings } from './types';
import { DEFAULT_SCHOOL_INFO } from './settings-defaults';

// Extend jsPDF types for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: UserOptions) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

/**
 * Helper to fetch cached institution settings
 */
function getActiveSchoolInfo(override?: Partial<SchoolInfoSettings>): SchoolInfoSettings {
  if (override && override.institutionName) {
    return { ...DEFAULT_SCHOOL_INFO, ...override };
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('apex_erp_settings_schoolInfo');
      if (raw) {
        return { ...DEFAULT_SCHOOL_INFO, ...JSON.parse(raw) };
      }
    } catch {}
  }
  return DEFAULT_SCHOOL_INFO;
}

/**
 * Builds a standardized, sanitized file name for report downloads
 */
export function buildReportFileName(
  reportType: string,
  granularity: string,
  batchSlug: string = 'all-batches',
  startDate?: string,
  endDate?: string,
  extension: 'csv' | 'pdf' = 'csv'
): string {
  const sanitize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_');

  const repTypeSlug = sanitize(reportType);
  const granSlug = sanitize(granularity);
  const bSlug = sanitize(batchSlug || 'all');
  const dateSlug = startDate && endDate ? `${startDate}_to_${endDate}` : `${new Date().toISOString().slice(0, 10)}`;

  return `${repTypeSlug}_${granSlug}_${bSlug}_${dateSlug}.${extension}`;
}

// -------------------------------------------------------------
// CSV Generation & Download Engine
// -------------------------------------------------------------

function escapeCSVField(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateReportCSV(result: GeneratedReportResult): string {
  const { definition, filter, rows } = result;
  const columns = definition.columns[filter.granularity] || [];

  // Header Row
  const headerLine = columns.map((col) => escapeCSVField(col.header)).join(',');

  // Data Rows
  const dataLines: string[] = [];

  if (rows.length === 0) {
    dataLines.push(columns.map((_, i) => (i === 0 ? '"No data found for selected filters"' : '""')).join(','));
  } else {
    rows.forEach((row: any) => {
      const rowFields = columns.map((col) => {
        const val = row[col.key];
        return escapeCSVField(val);
      });
      dataLines.push(rowFields.join(','));
    });
  }

  // Prepend UTF-8 BOM (\uFEFF) for Excel compatibility
  return `\uFEFF${headerLine}\r\n${dataLines.join('\r\n')}\r\n`;
}

export function downloadReportCSV(fileName: string, csvContent: string): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// PDF Generation & Download Engine
// -------------------------------------------------------------

export function generateReportPDF(
  result: GeneratedReportResult,
  customSchoolInfo?: Partial<SchoolInfoSettings>
): jsPDF {
  const school = getActiveSchoolInfo(customSchoolInfo);
  const { definition, filter, rows, resolvedDateRange, totalRowCount } = result;
  const columns = definition.columns[filter.granularity] || [];

  // Landscape for wide tables, portrait for compact tables
  const orientation = columns.length > 7 ? 'landscape' : 'portrait';

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Top Header Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Institution Name & Tagline
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text((school.institutionName || 'Apex Academy').toUpperCase(), 14, 13);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(school.tagline || 'Excellence in Academic Coaching & Institutional Management', 14, 19);
  doc.text(
    `Helpline: ${school.phone || '+91 9876543210'} | ${school.email || 'support@apexerp.com'} | Session: ${school.academicYear || '2026-2027'}`,
    14,
    25
  );

  // Document Title & Metadata Box
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(definition.title.toUpperCase(), 14, 40);

  // Meta Grid Summary Box
  const metaBoxY = 44;
  const metaBoxH = 18;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, metaBoxY, pageWidth - 28, metaBoxH, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, metaBoxY, pageWidth - 28, metaBoxH, 1.5, 1.5, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);

  const colWidth = (pageWidth - 36) / 4;
  const metaY1 = metaBoxY + 6;
  const metaY2 = metaBoxY + 12;

  doc.text('Report Granularity:', 18, metaY1);
  doc.text('Date Range:', 18 + colWidth, metaY1);
  doc.text('Total Records:', 18 + colWidth * 2, metaY1);
  doc.text('Generated On:', 18 + colWidth * 3, metaY1);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(filter.granularity === 'batch_summary' ? 'Batch Summary' : 'Student Detailed', 18, metaY2);
  doc.text(`${resolvedDateRange.startDate} to ${resolvedDateRange.endDate}`, 18 + colWidth, metaY2);
  doc.text(`${totalRowCount} row(s)`, 18 + colWidth * 2, metaY2);
  doc.text(new Date().toISOString().slice(0, 16).replace('T', ' '), 18 + colWidth * 3, metaY2);

  // Table Data Mapping
  const headers = columns.map((c) => c.header);
  const tableData =
    rows.length > 0
      ? rows.map((row: any) =>
          columns.map((c) => {
            const val = row[c.key];
            if (val === null || val === undefined) return '-';
            return String(val);
          })
        )
      : [[columns.map((_, i) => (i === 0 ? 'No records found for selected criteria.' : '-'))]];

  autoTable(doc, {
    startY: 66,
    head: [headers],
    body: rows.length > 0 ? (tableData as any[]) : [['No records matching selected filters found.', ...Array(columns.length - 1).fill('-')]],
    theme: 'striped',
    headStyles: {
      fillColor: [79, 70, 229], // Brand Indigo 600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.8,
      overflow: 'linebreak',
    },
    columnStyles: columns.reduce((acc: any, col, idx) => {
      acc[idx] = {
        halign: col.align || 'left',
      };
      return acc;
    }, {}),
    didParseCell: (data) => {
      if (data.section === 'body') {
        const val = String(data.cell.raw || '').toUpperCase();
        if (val === 'ELIGIBLE' || val === 'ACTIVE') {
          data.cell.styles.textColor = [5, 150, 105]; // Emerald
          data.cell.styles.fontStyle = 'bold';
        } else if (val.includes('ALERT') || val === 'CANCELLED' || val === 'FAIL') {
          data.cell.styles.textColor = [225, 29, 72]; // Rose
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 25 },
  });

  // Footer on each page
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);

    // Footer divider line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.text(`Official Academic Record — ${school.institutionName || 'Apex Academy'}`, 14, pageHeight - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }

  return doc;
}

export function downloadReportPDF(fileName: string, doc: jsPDF): void {
  if (typeof window === 'undefined') return;
  doc.save(fileName);
}
