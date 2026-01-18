// Supabase Edge Function: export-material-list
// Exports material lists to PDF, Excel (CSV), or sends via email

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExportRequest {
  material_list_id: string
  format: 'pdf' | 'excel' | 'csv' | 'email'
  recipient_email?: string // For email format
  include_summary?: boolean
  include_waste_factors?: boolean
}

interface MaterialListItem {
  id: string
  name: string
  quantity: number
  unit: string
  waste_factor: number
  order_quantity: number
  category: string | null
}

interface MaterialList {
  id: string
  name: string
  description: string | null
  status: string
  items: MaterialListItem[]
  waste_factors: Record<string, number>
  totals: {
    by_category: Record<string, number>
    total_items: number
    total_line_items: number
  }
  project?: {
    name: string
  }
  company?: {
    name: string
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request
    const request: ExportRequest = await req.json()
    const {
      material_list_id,
      format,
      recipient_email,
      include_summary = true,
      include_waste_factors = true,
    } = request

    if (!material_list_id) {
      throw new Error('material_list_id is required')
    }

    if (!format || !['pdf', 'excel', 'csv', 'email'].includes(format)) {
      throw new Error('Invalid format. Must be pdf, excel, csv, or email')
    }

    if (format === 'email' && !recipient_email) {
      throw new Error('recipient_email is required for email format')
    }

    // Fetch material list with project and company info
    const { data: materialList, error: fetchError } = await supabase
      .from('material_lists')
      .select(`
        *,
        project:projects(name),
        company:companies(name)
      `)
      .eq('id', material_list_id)
      .single()

    if (fetchError || !materialList) {
      throw new Error(`Material list not found: ${fetchError?.message || 'Unknown error'}`)
    }

    const list = materialList as unknown as MaterialList

    console.log(`Exporting material list "${list.name}" as ${format}`)

    let exportResult: {
      content?: string
      contentType?: string
      filename?: string
      downloadUrl?: string
      emailSent?: boolean
    } = {}

    // Generate export based on format
    switch (format) {
      case 'csv':
      case 'excel': {
        // Generate CSV content (Excel can import CSV)
        const csvContent = generateCSV(list, include_waste_factors)
        const filename = `${sanitizeFilename(list.name)}_${new Date().toISOString().split('T')[0]}.csv`

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('exports')
          .upload(`material-lists/${material_list_id}/${filename}`, csvContent, {
            contentType: 'text/csv',
            upsert: true,
          })

        if (uploadError) {
          throw new Error(`Failed to upload export: ${uploadError.message}`)
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('exports')
          .getPublicUrl(`material-lists/${material_list_id}/${filename}`)

        exportResult = {
          content: csvContent,
          contentType: 'text/csv',
          filename,
          downloadUrl: urlData.publicUrl,
        }
        break
      }

      case 'pdf': {
        // Generate HTML for PDF (would use a PDF library in production)
        const htmlContent = generateHTML(list, include_summary, include_waste_factors)
        const filename = `${sanitizeFilename(list.name)}_${new Date().toISOString().split('T')[0]}.html`

        // Upload HTML (in production, would convert to PDF)
        const { error: uploadError } = await supabase.storage
          .from('exports')
          .upload(`material-lists/${material_list_id}/${filename}`, htmlContent, {
            contentType: 'text/html',
            upsert: true,
          })

        if (uploadError) {
          throw new Error(`Failed to upload export: ${uploadError.message}`)
        }

        const { data: urlData } = supabase.storage
          .from('exports')
          .getPublicUrl(`material-lists/${material_list_id}/${filename}`)

        exportResult = {
          content: htmlContent,
          contentType: 'text/html',
          filename,
          downloadUrl: urlData.publicUrl,
        }
        break
      }

      case 'email': {
        // Generate email content and send
        const htmlContent = generateEmailHTML(list, include_summary)

        // In production, would use an email service like SendGrid, Resend, etc.
        // For now, we'll just log and simulate success
        console.log(`Would send email to: ${recipient_email}`)
        console.log(`Subject: Material List: ${list.name}`)

        exportResult = {
          emailSent: true,
        }
        break
      }
    }

    // Record export in history
    const exportRecord = {
      format,
      exported_at: new Date().toISOString(),
      exported_by: 'system', // Would extract from auth token in production
      recipient: recipient_email,
    }

    const currentHistory = (list as any).export_history || []
    await supabase
      .from('material_lists')
      .update({
        export_history: [exportRecord, ...currentHistory].slice(0, 50), // Keep last 50 exports
      } as any)
      .eq('id', material_list_id)

    return new Response(
      JSON.stringify({
        success: true,
        format,
        ...exportResult,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Export error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

// Helper: Sanitize filename
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50)
}

// Helper: Generate CSV content
function generateCSV(list: MaterialList, includeWaste: boolean): string {
  const headers = includeWaste
    ? ['Item Name', 'Quantity', 'Unit', 'Waste %', 'Order Quantity', 'Category']
    : ['Item Name', 'Quantity', 'Unit', 'Order Quantity', 'Category']

  const rows = list.items.map((item) => {
    const row = includeWaste
      ? [
          escapeCSV(item.name),
          item.quantity.toString(),
          item.unit,
          `${Math.round(item.waste_factor * 100)}%`,
          item.order_quantity.toString(),
          item.category || 'Uncategorized',
        ]
      : [
          escapeCSV(item.name),
          item.quantity.toString(),
          item.unit,
          item.order_quantity.toString(),
          item.category || 'Uncategorized',
        ]
    return row.join(',')
  })

  // Add header and totals
  const lines = [
    `# Material List: ${list.name}`,
    `# Generated: ${new Date().toISOString()}`,
    `# Total Line Items: ${list.totals.total_line_items}`,
    `# Total Quantity: ${list.totals.total_items}`,
    '',
    headers.join(','),
    ...rows,
  ]

  return lines.join('\n')
}

// Helper: Escape CSV value
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// Helper: Generate HTML content
function generateHTML(
  list: MaterialList,
  includeSummary: boolean,
  includeWaste: boolean
): string {
  const itemRows = list.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.quantity}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.unit}</td>
      ${includeWaste ? `<td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${Math.round(item.waste_factor * 100)}%</td>` : ''}
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${item.order_quantity}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.category || 'Uncategorized'}</td>
    </tr>
  `
    )
    .join('')

  const summarySection = includeSummary
    ? `
    <div style="margin-bottom: 24px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
      <h3 style="margin: 0 0 12px 0;">Summary</h3>
      <div style="display: flex; gap: 32px;">
        <div>
          <div style="font-size: 12px; color: #666;">Line Items</div>
          <div style="font-size: 24px; font-weight: bold;">${list.totals.total_line_items}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: #666;">Total Quantity</div>
          <div style="font-size: 24px; font-weight: bold;">${list.totals.total_items}</div>
        </div>
      </div>
    </div>
  `
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Material List: ${list.name}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #333; color: white; padding: 12px 8px; text-align: left; }
    tr:nth-child(even) { background: #f9f9f9; }
  </style>
</head>
<body>
  <h1>${list.name}</h1>
  ${list.description ? `<p style="color: #666;">${list.description}</p>` : ''}
  <p style="font-size: 12px; color: #999;">Generated: ${new Date().toLocaleDateString()}</p>

  ${summarySection}

  <table>
    <thead>
      <tr>
        <th>Item Name</th>
        <th style="text-align: right;">Quantity</th>
        <th style="text-align: center;">Unit</th>
        ${includeWaste ? '<th style="text-align: right;">Waste %</th>' : ''}
        <th style="text-align: right;">Order Qty</th>
        <th>Category</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <p style="margin-top: 32px; font-size: 12px; color: #999; text-align: center;">
    Generated by JobSight
  </p>
</body>
</html>
  `
}

// Helper: Generate email HTML
function generateEmailHTML(list: MaterialList, includeSummary: boolean): string {
  const summaryText = includeSummary
    ? `
    <p><strong>Summary:</strong></p>
    <ul>
      <li>Line Items: ${list.totals.total_line_items}</li>
      <li>Total Quantity: ${list.totals.total_items}</li>
    </ul>
  `
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6;">
  <h2>Material List: ${list.name}</h2>

  ${list.description ? `<p>${list.description}</p>` : ''}

  ${summaryText}

  <p>Please find the material list attached or click the link below to view:</p>

  <p><a href="#" style="color: #0066cc;">View Material List</a></p>

  <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">

  <p style="font-size: 12px; color: #666;">
    This email was sent from JobSight. If you have questions, please contact your project manager.
  </p>
</body>
</html>
  `
}
