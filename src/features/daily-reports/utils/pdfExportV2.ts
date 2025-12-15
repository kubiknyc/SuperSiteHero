/**
 * PDF Export Utility for Daily Reports V2
 * Comprehensive PDF generation with all V2 sections including:
 * - Delays (with classification for claims)
 * - Safety Incidents (OSHA compliance)
 * - Inspections (permit tracking)
 * - T&M Work (cost recovery)
 * - Progress Tracking (schedule variance)
 * - Enhanced workforce/equipment/deliveries/visitors
 * - Approval workflow with signatures
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import {
  addDocumentHeader,
  addFootersToAllPages,
  getCompanyInfo,
  type CompanyInfo,
} from '@/lib/utils/pdfBranding';
import type {
  DailyReportV2,
  WorkforceEntryV2,
  EquipmentEntryV2,
  DelayEntry,
  SafetyIncident,
  InspectionEntry,
  TMWorkEntry,
  ProgressEntry,
  DeliveryEntryV2,
  VisitorEntryV2,
  PhotoEntryV2,
  DelayCategory,
  IncidentType,
  InspectionResult,
  DeliveryInspectionStatus,
} from '@/types/daily-reports-v2';

// =====================================================
// CONSTANTS
// =====================================================

const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm
const MARGIN = 15;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

const COLORS = {
  primary: [41, 128, 185] as [number, number, number], // Blue
  secondary: [52, 73, 94] as [number, number, number], // Dark gray
  accent: [46, 204, 113] as [number, number, number], // Green
  warning: [241, 196, 15] as [number, number, number], // Yellow
  danger: [231, 76, 60] as [number, number, number], // Red
  orange: [230, 126, 34] as [number, number, number], // Orange
  purple: [155, 89, 182] as [number, number, number], // Purple
  lightGray: [245, 245, 245] as [number, number, number],
  mediumGray: [189, 195, 199] as [number, number, number],
  text: [44, 62, 80] as [number, number, number],
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function checkPageBreak(doc: jsPDF, yPos: number, neededSpace: number): number {
  if (yPos + neededSpace > PAGE_HEIGHT - MARGIN - 15) {
    doc.addPage();
    return MARGIN + 10;
  }
  return yPos;
}

function addSectionHeader(doc: jsPDF, title: string, yPos: number, color: [number, number, number] = COLORS.primary): number {
  yPos = checkPageBreak(doc, yPos, 15);

  doc.setFillColor(...color);
  doc.rect(MARGIN, yPos, CONTENT_WIDTH, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGIN + 3, yPos + 5.5);

  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');

  return yPos + 12;
}

function addSubsectionHeader(doc: jsPDF, title: string, yPos: number): number {
  yPos = checkPageBreak(doc, yPos, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.secondary);
  doc.text(title, MARGIN, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);

  return yPos + 5;
}

function addTextBlock(doc: jsPDF, label: string, text: string | null | undefined, yPos: number): number {
  if (!text) {return yPos;}

  yPos = checkPageBreak(doc, yPos, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.secondary);
  doc.text(label, MARGIN, yPos);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);

  const lines = doc.splitTextToSize(text, CONTENT_WIDTH - 5);
  doc.text(lines, MARGIN, yPos + 5);

  return yPos + 5 + lines.length * 4 + 3;
}

function formatTime(time: string | null | undefined): string {
  if (!time) {return '-';}
  const parts = time.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
  }
  return time;
}

function formatCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null) {return '-';}
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(date: string | null | undefined): string {
  if (!date) {return '-';}
  try {
    return format(new Date(date), 'MMM d, yyyy');
  } catch {
    return date;
  }
}

function getStatusColor(status: string | null | undefined): [number, number, number] {
  switch (status) {
    case 'approved':
    case 'locked':
      return COLORS.accent;
    case 'submitted':
    case 'in_review':
      return COLORS.primary;
    case 'changes_requested':
      return COLORS.warning;
    case 'rejected':
      return COLORS.danger;
    default:
      return COLORS.mediumGray;
  }
}

function getDelayTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    owner: 'Owner',
    contractor: 'Contractor',
    subcontractor: 'Subcontractor',
    weather: 'Weather',
    material: 'Material',
    inspection: 'Inspection',
    permit: 'Permit',
    design: 'Design',
    unforeseen: 'Unforeseen',
    labor: 'Labor',
    equipment: 'Equipment',
    other: 'Other',
  };
  return labels[type] || type;
}

function getDelayCategoryLabel(category: DelayCategory | undefined): string {
  if (!category) {return '-';}
  const labels: Record<DelayCategory, string> = {
    excusable_compensable: 'Excusable/Compensable',
    excusable_non_compensable: 'Excusable/Non-Compensable',
    non_excusable: 'Non-Excusable',
  };
  return labels[category] || category;
}

function getIncidentTypeLabel(type: IncidentType): string {
  const labels: Record<IncidentType, string> = {
    near_miss: 'Near Miss',
    first_aid: 'First Aid',
    recordable: 'OSHA Recordable',
    lost_time: 'Lost Time',
    fatality: 'Fatality',
  };
  return labels[type] || type;
}

function getInspectionResultLabel(result: InspectionResult | undefined): string {
  if (!result) {return '-';}
  const labels: Record<InspectionResult, string> = {
    pass: 'PASS',
    fail: 'FAIL',
    conditional: 'Conditional',
    scheduled: 'Scheduled',
    cancelled: 'Cancelled',
    rescheduled: 'Rescheduled',
  };
  return labels[result] || result;
}

function getDeliveryStatusLabel(status: DeliveryInspectionStatus): string {
  const labels: Record<DeliveryInspectionStatus, string> = {
    pending_inspection: 'Pending',
    accepted: 'Accepted',
    rejected: 'Rejected',
    partial: 'Partial',
  };
  return labels[status] || status;
}

// =====================================================
// SECTION RENDERERS
// =====================================================

async function addHeader(
  doc: jsPDF,
  report: DailyReportV2,
  projectName: string,
  gcCompany: CompanyInfo
): Promise<number> {
  // Add JobSight branded header with GC logo and info
  const reportDate = report.report_date
    ? format(new Date(report.report_date), 'MMMM d, yyyy')
    : 'N/A';
  const documentTitle = `${projectName} - ${reportDate}`;

  let yPos = await addDocumentHeader(doc, {
    gcCompany,
    documentTitle,
    documentType: 'DAILY REPORT',
  });

  // Status badge
  const status = report.status || 'draft';
  const statusColor = getStatusColor(status);
  const statusText = status.replace('_', ' ').toUpperCase();
  const statusWidth = doc.getTextWidth(statusText) + 8;

  doc.setFillColor(...statusColor);
  doc.roundedRect(PAGE_WIDTH - MARGIN - statusWidth, yPos, statusWidth, 8, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(statusText, PAGE_WIDTH - MARGIN - statusWidth + 4, yPos + 5.5);

  yPos += 12;

  // Report details
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);

  const reportNumber = report.report_number || 'N/A';

  doc.text(`Date: ${reportDate}`, MARGIN, yPos);
  doc.text(`Report #: ${reportNumber}`, MARGIN + 80, yPos);

  yPos += 5;

  // Shift info
  if (report.shift_start_time || report.shift_end_time) {
    doc.setFontSize(9);
    const shiftInfo = `Shift: ${formatTime(report.shift_start_time)} - ${formatTime(report.shift_end_time)}`;
    const shiftType = report.shift_type ? ` (${report.shift_type.replace('_', ' ')})` : '';
    doc.text(shiftInfo + shiftType, MARGIN, yPos);
    yPos += 4;
  }

  // Divider line
  doc.setDrawColor(...COLORS.mediumGray);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, yPos, PAGE_WIDTH - MARGIN, yPos);

  return yPos + 8;
}

function addWeatherSection(doc: jsPDF, report: DailyReportV2, yPos: number): number {
  yPos = addSectionHeader(doc, 'WEATHER CONDITIONS', yPos);

  const col1X = MARGIN;
  const col2X = MARGIN + 45;
  const col3X = MARGIN + 90;
  const col4X = MARGIN + 135;

  doc.setFontSize(9);

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.text('Conditions:', col1X, yPos);
  doc.text('High:', col2X, yPos);
  doc.text('Low:', col3X, yPos);
  doc.text('Precip:', col4X, yPos);

  doc.setFont('helvetica', 'normal');
  doc.text(report.weather_condition || '-', col1X + 25, yPos);
  doc.text(report.temperature_high ? `${report.temperature_high}°F` : '-', col2X + 15, yPos);
  doc.text(report.temperature_low ? `${report.temperature_low}°F` : '-', col3X + 13, yPos);
  doc.text(report.precipitation ? `${report.precipitation}"` : '-', col4X + 17, yPos);

  yPos += 6;

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.text('Wind:', col1X, yPos);
  doc.text('Direction:', col2X, yPos);
  doc.text('Humidity:', col3X, yPos);
  doc.text('Delays:', col4X, yPos);

  doc.setFont('helvetica', 'normal');
  doc.text(report.wind_speed ? `${report.wind_speed} mph` : '-', col1X + 15, yPos);
  doc.text(report.wind_direction || '-', col2X + 25, yPos);
  doc.text(report.humidity_percentage ? `${report.humidity_percentage}%` : '-', col3X + 23, yPos);

  if (report.weather_delays) {
    doc.setTextColor(...COLORS.danger);
    doc.text(`Yes (${report.weather_delay_hours || 0}h)`, col4X + 17, yPos);
    doc.setTextColor(...COLORS.text);
  } else {
    doc.text('No', col4X + 17, yPos);
  }

  yPos += 6;

  // Delay notes
  if (report.weather_delay_notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    const notes = doc.splitTextToSize(`Delay Notes: ${report.weather_delay_notes}`, CONTENT_WIDTH);
    doc.text(notes, col1X, yPos);
    yPos += notes.length * 3.5;
  }

  return yPos + 5;
}

function addWorkSummarySection(doc: jsPDF, report: DailyReportV2, yPos: number): number {
  if (!report.work_summary && !report.work_completed && !report.work_planned_tomorrow) {return yPos;}

  yPos = addSectionHeader(doc, 'WORK SUMMARY', yPos);

  if (report.work_summary) {
    yPos = addTextBlock(doc, 'Summary:', report.work_summary, yPos);
  }

  if (report.work_completed) {
    yPos = addTextBlock(doc, 'Work Completed:', report.work_completed, yPos);
  }

  if (report.work_planned_tomorrow) {
    yPos = addTextBlock(doc, 'Planned for Tomorrow:', report.work_planned_tomorrow, yPos);
  }

  return yPos + 3;
}

function addWorkforceSection(
  doc: jsPDF,
  workforce: WorkforceEntryV2[],
  yPos: number
): number {
  if (workforce.length === 0) {return yPos;}

  yPos = addSectionHeader(doc, 'WORKFORCE', yPos);

  // Calculate totals
  const totalWorkers = workforce.reduce((sum, w) => sum + (w.worker_count || 1), 0);
  const totalHours = workforce.reduce((sum, w) => sum + (w.hours_worked || 0), 0);
  const totalOT = workforce.reduce((sum, w) => sum + (w.hours_overtime || 0), 0);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total: ${totalWorkers} workers | ${totalHours.toFixed(1)} hours (${totalOT.toFixed(1)} OT)`, MARGIN, yPos);
  yPos += 5;

  // Table
  const tableData = workforce.map((w) => [
    w.company_name || w.team_name || w.trade || 'General',
    w.worker_count?.toString() || '1',
    w.foreman_name || '-',
    w.hours_regular?.toFixed(1) || w.hours_worked?.toFixed(1) || '-',
    w.hours_overtime?.toFixed(1) || '-',
    w.cost_code || '-',
    w.activity || '-',
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Company/Trade', 'Count', 'Foreman', 'Reg Hrs', 'OT Hrs', 'Cost Code', 'Activity']],
    body: tableData,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: {
      fillColor: COLORS.secondary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 25 },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 20 },
      6: { cellWidth: 'auto' },
    },
  });

  return (doc as any).lastAutoTable.finalY + 8;
}

function addEquipmentSection(
  doc: jsPDF,
  equipment: EquipmentEntryV2[],
  yPos: number
): number {
  if (equipment.length === 0) {return yPos;}

  yPos = addSectionHeader(doc, 'EQUIPMENT ON SITE', yPos);

  const tableData = equipment.map((e) => [
    e.equipment_type,
    e.quantity?.toString() || '1',
    e.owner || e.rental_company || '-',
    e.hours_used?.toFixed(1) || '-',
    e.hours_idle?.toFixed(1) || '-',
    e.operator_name || '-',
    e.cost_code || '-',
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Equipment', 'Qty', 'Owner/Rental', 'Used', 'Idle', 'Operator', 'Cost Code']],
    body: tableData,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: {
      fillColor: COLORS.secondary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 12, halign: 'center' },
      2: { cellWidth: 30 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 30 },
      6: { cellWidth: 'auto' },
    },
  });

  return (doc as any).lastAutoTable.finalY + 8;
}

function addDelaysSection(
  doc: jsPDF,
  delays: DelayEntry[],
  yPos: number
): number {
  if (delays.length === 0) {return yPos;}

  yPos = addSectionHeader(doc, 'DELAYS & DISRUPTIONS', yPos, COLORS.danger);

  // Summary
  const totalHours = delays.reduce((sum, d) => sum + (d.duration_hours || 0), 0);
  const totalDays = delays.reduce((sum, d) => sum + (d.duration_days || 0), 0);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.danger);
  doc.text(`Total Delay Impact: ${totalHours.toFixed(1)} hours | ${totalDays.toFixed(1)} days`, MARGIN, yPos);
  doc.setTextColor(...COLORS.text);
  yPos += 5;

  // Table
  const tableData = delays.map((d) => [
    getDelayTypeLabel(d.delay_type),
    getDelayCategoryLabel(d.delay_category),
    d.duration_hours?.toFixed(1) || '-',
    d.responsible_party || '-',
    d.description.substring(0, 60) + (d.description.length > 60 ? '...' : ''),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Type', 'Category', 'Hours', 'Responsible', 'Description']],
    body: tableData,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: {
      fillColor: COLORS.danger,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [255, 240, 240] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 35 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 30 },
      4: { cellWidth: 'auto' },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 3;

  // Detailed descriptions
  for (const delay of delays) {
    if (delay.schedule_impact_days || delay.cost_impact_estimate) {
      yPos = checkPageBreak(doc, yPos, 15);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      let impact = `${getDelayTypeLabel(delay.delay_type)}: `;
      if (delay.schedule_impact_days) {impact += `Schedule impact: ${delay.schedule_impact_days} days. `;}
      if (delay.cost_impact_estimate) {impact += `Cost impact: ${formatCurrency(delay.cost_impact_estimate)}`;}
      const lines = doc.splitTextToSize(impact, CONTENT_WIDTH);
      doc.text(lines, MARGIN, yPos);
      yPos += lines.length * 3.5;
    }
  }

  return yPos + 5;
}

function addSafetyIncidentsSection(
  doc: jsPDF,
  incidents: SafetyIncident[],
  yPos: number
): number {
  if (incidents.length === 0) {return yPos;}

  yPos = addSectionHeader(doc, 'SAFETY INCIDENTS', yPos, COLORS.orange);

  // Summary
  const oshaRecordable = incidents.filter((i) =>
    ['recordable', 'lost_time', 'fatality'].includes(i.incident_type)
  ).length;

  if (oshaRecordable > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.danger);
    doc.text(`WARNING: ${oshaRecordable} OSHA RECORDABLE INCIDENT(S)`, MARGIN, yPos);
    doc.setTextColor(...COLORS.text);
    yPos += 6;
  }

  for (const incident of incidents) {
    yPos = checkPageBreak(doc, yPos, 40);

    // Incident header with severity color
    const severityColor = ['recordable', 'lost_time', 'fatality'].includes(incident.incident_type)
      ? COLORS.danger
      : incident.incident_type === 'first_aid'
        ? COLORS.warning
        : COLORS.accent;

    doc.setFillColor(...severityColor);
    doc.rect(MARGIN, yPos, 4, 20, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${getIncidentTypeLabel(incident.incident_type)}`, MARGIN + 6, yPos + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Time: ${formatTime(incident.incident_time)} | Location: ${incident.incident_location || '-'}`, MARGIN + 6, yPos + 9);

    // Description
    const descLines = doc.splitTextToSize(incident.description, CONTENT_WIDTH - 10);
    doc.text(descLines, MARGIN + 6, yPos + 14);
    yPos += 14 + descLines.length * 3.5;

    // Injured party (if applicable)
    if (incident.injured_party_name) {
      yPos = checkPageBreak(doc, yPos, 10);
      doc.setFont('helvetica', 'bold');
      doc.text('Injured Party: ', MARGIN + 6, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`${incident.injured_party_name} (${incident.injured_party_company || '-'})`, MARGIN + 35, yPos);
      yPos += 4;

      if (incident.injury_type || incident.body_part_affected) {
        doc.text(`Injury: ${incident.injury_type || '-'} | Body Part: ${incident.body_part_affected || '-'}`, MARGIN + 6, yPos);
        yPos += 4;
      }
    }

    // Corrective actions
    if (incident.corrective_actions) {
      yPos = checkPageBreak(doc, yPos, 10);
      doc.setFont('helvetica', 'bold');
      doc.text('Corrective Actions:', MARGIN + 6, yPos);
      doc.setFont('helvetica', 'normal');
      const actionLines = doc.splitTextToSize(incident.corrective_actions, CONTENT_WIDTH - 10);
      doc.text(actionLines, MARGIN + 6, yPos + 4);
      yPos += 4 + actionLines.length * 3.5;
    }

    // OSHA info
    if (incident.osha_reportable) {
      yPos = checkPageBreak(doc, yPos, 6);
      doc.setTextColor(...COLORS.danger);
      doc.setFont('helvetica', 'bold');
      doc.text(`OSHA REPORTABLE${incident.osha_case_number ? ` - Case #: ${incident.osha_case_number}` : ''}`, MARGIN + 6, yPos);
      doc.setTextColor(...COLORS.text);
      doc.setFont('helvetica', 'normal');
      yPos += 4;
    }

    yPos += 4;
  }

  return yPos + 3;
}

function addInspectionsSection(
  doc: jsPDF,
  inspections: InspectionEntry[],
  yPos: number
): number {
  if (inspections.length === 0) {return yPos;}

  yPos = addSectionHeader(doc, 'INSPECTIONS', yPos, COLORS.purple);

  // Summary
  const passed = inspections.filter((i) => i.result === 'pass').length;
  const failed = inspections.filter((i) => i.result === 'fail').length;
  const conditional = inspections.filter((i) => i.result === 'conditional').length;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Results: ${passed} Passed | ${conditional} Conditional | ${failed} Failed`, MARGIN, yPos);
  yPos += 5;

  const tableData = inspections.map((i) => {
    const resultText = getInspectionResultLabel(i.result);
    return [
      i.inspection_type,
      i.inspector_name || '-',
      formatTime(i.inspection_time),
      resultText,
      i.permit_number || '-',
      i.reinspection_required ? formatDate(i.reinspection_date) : '-',
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Type', 'Inspector', 'Time', 'Result', 'Permit #', 'Reinspection']],
    body: tableData,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: {
      fillColor: COLORS.purple,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 30 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 25 },
      5: { cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      if (data.column.index === 3 && data.section === 'body') {
        const value = data.cell.raw as string;
        if (value === 'PASS') {
          data.cell.styles.textColor = COLORS.accent;
          data.cell.styles.fontStyle = 'bold';
        } else if (value === 'FAIL') {
          data.cell.styles.textColor = COLORS.danger;
          data.cell.styles.fontStyle = 'bold';
        } else if (value === 'Conditional') {
          data.cell.styles.textColor = COLORS.warning;
        }
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 3;

  // Deficiencies/Notes
  for (const inspection of inspections) {
    if (inspection.deficiencies_noted || inspection.corrective_actions_required) {
      yPos = checkPageBreak(doc, yPos, 15);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`${inspection.inspection_type}:`, MARGIN, yPos);
      doc.setFont('helvetica', 'normal');

      if (inspection.deficiencies_noted) {
        const lines = doc.splitTextToSize(`Deficiencies: ${inspection.deficiencies_noted}`, CONTENT_WIDTH - 5);
        doc.text(lines, MARGIN + 2, yPos + 4);
        yPos += 4 + lines.length * 3.5;
      }

      if (inspection.corrective_actions_required) {
        const lines = doc.splitTextToSize(`Corrective Actions: ${inspection.corrective_actions_required}`, CONTENT_WIDTH - 5);
        doc.text(lines, MARGIN + 2, yPos);
        yPos += lines.length * 3.5;
      }

      yPos += 2;
    }
  }

  return yPos + 5;
}

function addTMWorkSection(
  doc: jsPDF,
  tmWork: TMWorkEntry[],
  yPos: number
): number {
  if (tmWork.length === 0) {return yPos;}

  yPos = addSectionHeader(doc, 'TIME & MATERIALS WORK', yPos, COLORS.warning);

  // Grand totals
  const grandTotal = tmWork.reduce((sum, t) => sum + (t.total_cost || 0), 0);
  const totalLabor = tmWork.reduce((sum, t) => sum + (t.total_labor_cost || 0), 0);
  const totalMaterials = tmWork.reduce((sum, t) => sum + (t.total_materials_cost || 0), 0);
  const totalEquipment = tmWork.reduce((sum, t) => sum + (t.total_equipment_cost || 0), 0);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Grand Total: ${formatCurrency(grandTotal)} (Labor: ${formatCurrency(totalLabor)} | Materials: ${formatCurrency(totalMaterials)} | Equipment: ${formatCurrency(totalEquipment)})`,
    MARGIN,
    yPos
  );
  yPos += 6;

  for (const tm of tmWork) {
    yPos = checkPageBreak(doc, yPos, 35);

    // Entry header
    doc.setFillColor(...COLORS.lightGray);
    doc.rect(MARGIN, yPos, CONTENT_WIDTH, 7, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${tm.work_order_number || 'T&M'}: ${tm.description}`, MARGIN + 2, yPos + 5);
    yPos += 10;

    // Labor table
    if (tm.labor_entries && tm.labor_entries.length > 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Labor:', MARGIN, yPos);
      yPos += 3;

      const laborData = tm.labor_entries.map((l) => [
        l.trade,
        l.hours?.toFixed(1) || '-',
        formatCurrency(l.rate),
        formatCurrency(l.cost || (l.hours || 0) * (l.rate || 0)),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Trade', 'Hours', 'Rate', 'Cost']],
        body: laborData,
        margin: { left: MARGIN + 5, right: MARGIN + 60 },
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fillColor: COLORS.secondary, textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 20, halign: 'right' },
          2: { cellWidth: 25, halign: 'right' },
          3: { cellWidth: 25, halign: 'right' },
        },
      });
      yPos = (doc as any).lastAutoTable.finalY + 2;
    }

    // Materials table
    if (tm.materials_used && tm.materials_used.length > 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Materials:', MARGIN, yPos);
      yPos += 3;

      const materialsData = tm.materials_used.map((m) => [
        m.item,
        `${m.quantity} ${m.unit}`,
        formatCurrency(m.unit_cost),
        formatCurrency(m.total || (m.quantity || 0) * (m.unit_cost || 0)),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Item', 'Quantity', 'Unit Cost', 'Total']],
        body: materialsData,
        margin: { left: MARGIN + 5, right: MARGIN + 60 },
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fillColor: COLORS.secondary, textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25, halign: 'right' },
          3: { cellWidth: 25, halign: 'right' },
        },
      });
      yPos = (doc as any).lastAutoTable.finalY + 2;
    }

    // Entry total
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`Entry Total: ${formatCurrency(tm.total_cost)}`, MARGIN + CONTENT_WIDTH - 50, yPos);

    // Authorization
    if (tm.authorized_by) {
      yPos += 4;
      doc.setFont('helvetica', 'normal');
      doc.text(`Authorized by: ${tm.authorized_by} on ${formatDate(tm.authorization_date)}`, MARGIN, yPos);
    }

    yPos += 6;
  }

  return yPos + 3;
}

function addProgressSection(
  doc: jsPDF,
  progress: ProgressEntry[],
  yPos: number
): number {
  if (progress.length === 0) {return yPos;}

  yPos = addSectionHeader(doc, 'PROGRESS TRACKING', yPos);

  // Summary
  const avgVariance =
    progress.length > 0
      ? progress.reduce((sum, p) => sum + (p.variance_percentage || 0), 0) / progress.length
      : 0;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const varianceColor = avgVariance >= 0 ? COLORS.accent : COLORS.danger;
  doc.setTextColor(...varianceColor);
  doc.text(`Average Variance: ${avgVariance >= 0 ? '+' : ''}${avgVariance.toFixed(1)}%`, MARGIN, yPos);
  doc.setTextColor(...COLORS.text);
  yPos += 5;

  const tableData = progress.map((p) => {
    const variance = p.variance_percentage || 0;
    const varianceStr = `${variance >= 0 ? '+' : ''}${variance.toFixed(1)}%`;
    return [
      p.activity_name,
      p.cost_code || '-',
      `${p.planned_percentage_today?.toFixed(1) || '-'}%`,
      `${p.actual_percentage_today?.toFixed(1) || '-'}%`,
      varianceStr,
      `${p.cumulative_percentage?.toFixed(1) || '-'}%`,
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Activity', 'Cost Code', 'Planned', 'Actual', 'Variance', 'Cumulative']],
    body: tableData,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: {
      fillColor: COLORS.secondary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 25 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 'auto', halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.column.index === 4 && data.section === 'body') {
        const value = parseFloat(data.cell.raw as string);
        if (value >= 0) {
          data.cell.styles.textColor = COLORS.accent;
        } else {
          data.cell.styles.textColor = COLORS.danger;
        }
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 3;

  // Variance reasons
  for (const entry of progress) {
    if (entry.variance_reason && (entry.variance_percentage || 0) < -5) {
      yPos = checkPageBreak(doc, yPos, 12);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.danger);
      doc.text(`${entry.activity_name} - Behind Schedule:`, MARGIN, yPos);
      doc.setTextColor(...COLORS.text);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(entry.variance_reason, CONTENT_WIDTH - 5);
      doc.text(lines, MARGIN + 2, yPos + 4);
      yPos += 4 + lines.length * 3.5;

      if (entry.corrective_action) {
        doc.setFont('helvetica', 'italic');
        const actionLines = doc.splitTextToSize(`Corrective Action: ${entry.corrective_action}`, CONTENT_WIDTH - 5);
        doc.text(actionLines, MARGIN + 2, yPos);
        yPos += actionLines.length * 3.5 + 2;
      }
    }
  }

  return yPos + 5;
}

function addDeliveriesSection(
  doc: jsPDF,
  deliveries: DeliveryEntryV2[],
  yPos: number
): number {
  if (deliveries.length === 0) {return yPos;}

  yPos = addSectionHeader(doc, 'MATERIAL DELIVERIES', yPos);

  // Summary
  const accepted = deliveries.filter((d) => d.inspection_status === 'accepted').length;
  const rejected = deliveries.filter((d) => d.inspection_status === 'rejected').length;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`${deliveries.length} deliveries: ${accepted} accepted, ${rejected} rejected`, MARGIN, yPos);
  yPos += 5;

  const tableData = deliveries.map((d) => [
    d.material_description,
    d.quantity || '-',
    d.vendor || '-',
    d.po_number || '-',
    formatTime(d.delivery_time),
    getDeliveryStatusLabel(d.inspection_status),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Material', 'Qty', 'Vendor', 'PO #', 'Time', 'Status']],
    body: tableData,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: {
      fillColor: COLORS.secondary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 20 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25 },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 'auto', halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.column.index === 5 && data.section === 'body') {
        const value = data.cell.raw as string;
        if (value === 'Accepted') {
          data.cell.styles.textColor = COLORS.accent;
        } else if (value === 'Rejected') {
          data.cell.styles.textColor = COLORS.danger;
        } else if (value === 'Partial') {
          data.cell.styles.textColor = COLORS.warning;
        }
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 3;

  // Rejection reasons
  for (const delivery of deliveries) {
    if (delivery.rejection_reason) {
      yPos = checkPageBreak(doc, yPos, 10);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.danger);
      doc.text(`${delivery.material_description} - Rejected:`, MARGIN, yPos);
      doc.setTextColor(...COLORS.text);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(delivery.rejection_reason, CONTENT_WIDTH - 5);
      doc.text(lines, MARGIN + 2, yPos + 4);
      yPos += 4 + lines.length * 3.5 + 2;
    }
  }

  return yPos + 5;
}

function addVisitorsSection(
  doc: jsPDF,
  visitors: VisitorEntryV2[],
  yPos: number
): number {
  if (visitors.length === 0) {return yPos;}

  yPos = addSectionHeader(doc, 'SITE VISITORS', yPos);

  const tableData = visitors.map((v) => [
    v.visitor_name,
    v.company || '-',
    v.purpose || '-',
    formatTime(v.arrival_time),
    formatTime(v.departure_time),
    v.safety_orientation_completed ? 'Yes' : 'No',
    v.escort_name || (v.escort_required ? 'Required' : '-'),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Name', 'Company', 'Purpose', 'In', 'Out', 'Safety', 'Escort']],
    body: tableData,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: {
      fillColor: COLORS.secondary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 30 },
      2: { cellWidth: 30 },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 'auto' },
    },
  });

  return (doc as any).lastAutoTable.finalY + 8;
}

function addIssuesSection(doc: jsPDF, report: DailyReportV2, yPos: number): number {
  if (!report.issues && !report.observations && !report.comments) {return yPos;}

  yPos = addSectionHeader(doc, 'ISSUES & OBSERVATIONS', yPos);

  if (report.issues) {
    yPos = addTextBlock(doc, 'Issues/Problems:', report.issues, yPos);
  }

  if (report.observations) {
    yPos = addTextBlock(doc, 'Observations:', report.observations, yPos);
  }

  if (report.comments) {
    yPos = addTextBlock(doc, 'Additional Comments:', report.comments, yPos);
  }

  return yPos + 3;
}

function addApprovalSection(doc: jsPDF, report: DailyReportV2, yPos: number): number {
  if (!report.submitted_by_name && !report.approved_by_name) {return yPos;}

  yPos = addSectionHeader(doc, 'APPROVAL & SIGNATURES', yPos);

  const signatureBoxWidth = (CONTENT_WIDTH - 10) / 2;
  const signatureBoxHeight = 30;

  // Submitted by
  if (report.submitted_by_name) {
    doc.setDrawColor(...COLORS.mediumGray);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN, yPos, signatureBoxWidth, signatureBoxHeight);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Submitted By:', MARGIN + 3, yPos + 5);

    // Signature image (if available)
    if (report.submitted_by_signature && report.submitted_by_signature.startsWith('data:')) {
      try {
        doc.addImage(report.submitted_by_signature, 'PNG', MARGIN + 5, yPos + 7, signatureBoxWidth - 10, 15);
      } catch {
        // Skip if image can't be added
      }
    }

    doc.setFont('helvetica', 'normal');
    doc.text(report.submitted_by_name, MARGIN + 3, yPos + 25);
    doc.setFontSize(7);
    doc.text(formatDate(report.submitted_at), MARGIN + 3, yPos + 28);
  }

  // Approved by
  if (report.approved_by_name) {
    const approvedX = MARGIN + signatureBoxWidth + 10;
    doc.rect(approvedX, yPos, signatureBoxWidth, signatureBoxHeight);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Approved By:', approvedX + 3, yPos + 5);

    // Signature image (if available)
    if (report.approved_by_signature && report.approved_by_signature.startsWith('data:')) {
      try {
        doc.addImage(report.approved_by_signature, 'PNG', approvedX + 5, yPos + 7, signatureBoxWidth - 10, 15);
      } catch {
        // Skip if image can't be added
      }
    }

    doc.setFont('helvetica', 'normal');
    doc.text(report.approved_by_name, approvedX + 3, yPos + 25);
    doc.setFontSize(7);
    doc.text(formatDate(report.approved_at), approvedX + 3, yPos + 28);
  }

  yPos += signatureBoxHeight + 5;

  // Approval comments
  if (report.approval_comments) {
    yPos = addTextBlock(doc, 'Approval Comments:', report.approval_comments, yPos);
  }

  // Rejection reason
  if (report.rejection_reason) {
    doc.setTextColor(...COLORS.danger);
    yPos = addTextBlock(doc, 'Changes Requested:', report.rejection_reason, yPos);
    doc.setTextColor(...COLORS.text);
  }

  return yPos + 3;
}

function addPhotosSection(doc: jsPDF, photos: PhotoEntryV2[], yPos: number): number {
  if (photos.length === 0) {return yPos;}

  yPos = addSectionHeader(doc, 'PHOTO DOCUMENTATION', yPos);

  // Summary by category
  const categories = photos.reduce(
    (acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const categoryText = Object.entries(categories)
    .map(([cat, count]) => `${count} ${cat}`)
    .join(', ');
  doc.text(`${photos.length} photos: ${categoryText}`, MARGIN, yPos);
  yPos += 5;

  // Photo list (no images in PDF to keep size small)
  const tableData = photos.map((p) => [
    p.caption || '(No caption)',
    p.category,
    p.work_area || '-',
    p.taken_by || '-',
    formatDate(p.taken_at),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Caption', 'Category', 'Area', 'Taken By', 'Date']],
    body: tableData,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: {
      fillColor: COLORS.secondary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 25 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 'auto' },
    },
  });

  return (doc as any).lastAutoTable.finalY + 8;
}

// Footer function removed - using centralized JobSight branding from pdfBranding.ts

// =====================================================
// MAIN EXPORT FUNCTIONS
// =====================================================

export interface GeneratePDFOptionsV2 {
  report: DailyReportV2;
  workforce?: WorkforceEntryV2[];
  equipment?: EquipmentEntryV2[];
  delays?: DelayEntry[];
  safetyIncidents?: SafetyIncident[];
  inspections?: InspectionEntry[];
  tmWork?: TMWorkEntry[];
  progress?: ProgressEntry[];
  deliveries?: DeliveryEntryV2[];
  visitors?: VisitorEntryV2[];
  photos?: PhotoEntryV2[];
  projectName: string;
  projectId: string; // Required for fetching company branding info
  gcCompany?: CompanyInfo; // Optional: provide company info directly to avoid fetching
}

/**
 * Generate a comprehensive PDF for a V2 daily report
 */
export async function generateDailyReportPDFV2(options: GeneratePDFOptionsV2): Promise<Blob> {
  const {
    report,
    workforce = report.workforce || [],
    equipment = report.equipment || [],
    delays = report.delays || [],
    safetyIncidents = report.safety_incidents || [],
    inspections = report.inspections || [],
    tmWork = report.tm_work || [],
    progress = report.progress || [],
    deliveries = report.deliveries || [],
    visitors = report.visitors || [],
    photos = report.photos || [],
    projectName,
    projectId,
    gcCompany,
  } = options;

  // Get company info for branding (fetch if not provided)
  const companyInfo = gcCompany || (await getCompanyInfo(projectId));

  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Add sections in logical order (note: addHeader is now async)
  let yPos = await addHeader(doc, report, projectName, companyInfo);
  yPos = addWeatherSection(doc, report, yPos);
  yPos = addWorkSummarySection(doc, report, yPos);
  yPos = addWorkforceSection(doc, workforce, yPos);
  yPos = addEquipmentSection(doc, equipment, yPos);

  // Critical sections for claims/compliance
  yPos = addDelaysSection(doc, delays, yPos);
  yPos = addSafetyIncidentsSection(doc, safetyIncidents, yPos);
  yPos = addInspectionsSection(doc, inspections, yPos);
  yPos = addTMWorkSection(doc, tmWork, yPos);
  yPos = addProgressSection(doc, progress, yPos);

  // Standard sections
  yPos = addDeliveriesSection(doc, deliveries, yPos);
  yPos = addVisitorsSection(doc, visitors, yPos);
  yPos = addIssuesSection(doc, report, yPos);
  yPos = addPhotosSection(doc, photos, yPos);

  // Approval section at the end
  addApprovalSection(doc, report, yPos);

  // Add JobSight footer to all pages with "Powered by JobSightApp.com"
  addFootersToAllPages(doc);

  return doc.output('blob');
}

/**
 * Generate and download a V2 daily report PDF
 */
export async function downloadDailyReportPDFV2(options: GeneratePDFOptionsV2): Promise<void> {
  const blob = await generateDailyReportPDFV2(options);

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  // Generate filename
  const dateStr = options.report.report_date
    ? format(new Date(options.report.report_date), 'yyyy-MM-dd')
    : 'report';
  const reportNum = options.report.report_number || '';
  link.download = `Daily_Report_${dateStr}${reportNum ? '_' + reportNum : ''}.pdf`;

  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Cleanup
  URL.revokeObjectURL(url);
}

// Re-export original functions for backward compatibility
export { generateDailyReportPDF, downloadDailyReportPDF } from './pdfExport';
