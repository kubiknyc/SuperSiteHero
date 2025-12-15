// File: /src/features/checklists/utils/pdfExport.ts
// PDF export utility for checklist executions using jsPDF

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import type { ChecklistExecutionWithResponses, ChecklistTemplateItem } from '@/types/checklists'

interface ScoreSummary {
  pass_count: number
  fail_count: number
  na_count: number
  total_count: number
  pass_percentage: number
}

/**
 * Format response data for display in PDF
 */
function formatResponseValue(response: any, itemType: string): string {
  const data = response.response_data as any

  switch (itemType) {
    case 'checkbox':
      if (response.score_value === 'pass') {return 'Pass ✓'}
      if (response.score_value === 'fail') {return 'Fail ✗'}
      if (response.score_value === 'na') {return 'N/A'}
      return data?.value === 'checked' ? 'Checked' : 'Unchecked'

    case 'text':
      return data?.value || 'No response'

    case 'number':
      return data?.value ? `${data.value} ${data.units || ''}`.trim() : 'No response'

    case 'photo':
      const photoUrls = response.photo_urls || []
      return photoUrls.length > 0 ? `${photoUrls.length} photo(s)` : 'No photos'

    case 'signature':
      return response.signature_url ? 'Signed' : 'Not signed'

    default:
      return 'Unknown'
  }
}

/**
 * Generate PDF for a completed checklist execution
 */
export async function generateChecklistPDF(
  execution: ChecklistExecutionWithResponses,
  templateItems: ChecklistTemplateItem[],
  score: ScoreSummary | null
): Promise<void> {
  const doc = new jsPDF()
  let yPosition = 20

  // Header
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(execution.name, 20, yPosition)
  yPosition += 10

  // Status badge
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Status: ${execution.status.replace('_', ' ').toUpperCase()}`, 20, yPosition)
  yPosition += 10

  // Metadata section
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Inspection Details', 20, yPosition)
  yPosition += 7

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  const metadata: string[] = []
  if (execution.location) {metadata.push(`Location: ${execution.location}`)}
  if (execution.inspector_name) {metadata.push(`Inspector: ${execution.inspector_name}`)}
  if (execution.weather_conditions) {metadata.push(`Weather: ${execution.weather_conditions}`)}
  if (execution.temperature) {metadata.push(`Temperature: ${execution.temperature}°F`)}
  metadata.push(`Created: ${format(new Date(execution.created_at), 'PPP p')}`)
  if (execution.completed_at) {
    metadata.push(`Completed: ${format(new Date(execution.completed_at), 'PPP p')}`)
  }

  metadata.forEach((item) => {
    doc.text(item, 20, yPosition)
    yPosition += 5
  })
  yPosition += 5

  // Score summary (if available)
  if (score && score.total_count > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Score Summary', 20, yPosition)
    yPosition += 7

    autoTable(doc, {
      startY: yPosition,
      head: [['Pass', 'Fail', 'N/A', 'Total', 'Pass Rate']],
      body: [
        [
          score.pass_count.toString(),
          score.fail_count.toString(),
          score.na_count.toString(),
          score.total_count.toString(),
          `${Math.round(score.pass_percentage)}%`,
        ],
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 20, right: 20 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  }

  // Group responses by section
  const responseMap = new Map(
    execution.responses?.map((r) => [r.checklist_template_item_id, r]) || []
  )

  const sectionMap = new Map<string, typeof templateItems>()
  templateItems.forEach((item) => {
    const section = item.section || 'General'
    if (!sectionMap.has(section)) {
      sectionMap.set(section, [])
    }
    sectionMap.get(section)!.push(item)
  })

  // Render each section
  const sections = Array.from(sectionMap.entries())
  sections.forEach(([sectionName, items], sectionIndex) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 20
    }

    // Section header
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(sectionName, 20, yPosition)
    yPosition += 7

    // Section items table
    const tableData = items
      .map((item) => {
        const response = responseMap.get(item.id)
        if (!response) {return null}

        const value = formatResponseValue(response, item.item_type)
        const notes = response.notes || '-'

        return [
          item.label,
          item.item_type,
          value,
          response.score_value ? response.score_value.toUpperCase() : '-',
          notes.length > 50 ? notes.substring(0, 47) + '...' : notes,
        ]
      })
      .filter((row) => row !== null) as string[][]

    autoTable(doc, {
      startY: yPosition,
      head: [['Item', 'Type', 'Response', 'Score', 'Notes']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 25 },
        2: { cellWidth: 40 },
        3: { cellWidth: 20 },
        4: { cellWidth: 45 },
      },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 9 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10
  })

  // Footer with generation timestamp
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Generated: ${format(new Date(), 'PPP p')} | Page ${i} of ${pageCount}`,
      20,
      doc.internal.pageSize.height - 10
    )
  }

  // Save the PDF
  const fileName = `checklist-${execution.name.replace(/\s+/g, '-').toLowerCase()}-${format(
    new Date(),
    'yyyy-MM-dd'
  )}.pdf`
  doc.save(fileName)
}
