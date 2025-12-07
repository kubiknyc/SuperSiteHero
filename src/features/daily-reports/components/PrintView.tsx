// Print-friendly view for daily reports
import { format } from 'date-fns'
import type { DailyReport } from '@/types/database'

interface PrintViewProps {
  report: DailyReport & { project?: { id: string; name: string } | null }
  workforce: Array<{
    entry_type: string | null
    team_name?: string | null
    worker_name?: string | null
    trade?: string | null
    worker_count?: number | null
    activity?: string | null
    hours_worked?: number | null
  }>
  equipment: Array<{
    equipment_type: string | null
    equipment_description?: string | null
    quantity: number | null
    owner?: string | null
    hours_used?: number | null
    notes?: string | null
  }>
  deliveries: Array<{
    material_description: string | null
    quantity?: string | null
    vendor?: string | null
    delivery_ticket_number?: string | null
    delivery_time?: string | null
    notes?: string | null
  }>
  visitors: Array<{
    visitor_name: string | null
    company?: string | null
    purpose?: string | null
    arrival_time?: string | null
    departure_time?: string | null
  }>
  projectName?: string
  onClose?: () => void
}

export function PrintView({ report, workforce, equipment, deliveries, visitors }: PrintViewProps) {
  const reportDate = report.report_date ? format(new Date(report.report_date), 'MMMM d, yyyy') : 'N/A'

  return (
    <div className="print-view bg-white p-8 max-w-4xl mx-auto">
      {/* Print-specific styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-view, .print-view * {
            visibility: visible;
          }
          .print-view {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-before: always;
          }
          table {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Header */}
      <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">DAILY REPORT</h1>
        <p className="text-lg text-gray-600">{report.project?.name || 'Project'}</p>
      </div>

      {/* Report Info */}
      <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
        <div>
          <span className="font-semibold">Date:</span> {reportDate}
        </div>
        <div>
          <span className="font-semibold">Report #:</span> {report.report_number || 'N/A'}
        </div>
        <div>
          <span className="font-semibold">Status:</span>{' '}
          <span className="capitalize">{report.status || 'Draft'}</span>
        </div>
      </div>

      {/* Weather Section */}
      <section className="mb-6">
        <h2 className="text-lg font-bold border-b border-gray-400 pb-1 mb-3">Weather Conditions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-semibold">Condition:</span> {report.weather_condition || 'N/A'}
          </div>
          <div>
            <span className="font-semibold">High:</span> {report.temperature_high ? `${report.temperature_high}°F` : 'N/A'}
          </div>
          <div>
            <span className="font-semibold">Low:</span> {report.temperature_low ? `${report.temperature_low}°F` : 'N/A'}
          </div>
          <div>
            <span className="font-semibold">Wind:</span> {report.wind_speed ? `${report.wind_speed} mph` : 'N/A'}
          </div>
        </div>
        {report.weather_delays && (
          <div className="mt-2 text-sm">
            <span className="font-semibold text-red-600">Weather Delays:</span>{' '}
            {report.weather_delay_notes || 'Yes'}
          </div>
        )}
      </section>

      {/* Work Section */}
      <section className="mb-6">
        <h2 className="text-lg font-bold border-b border-gray-400 pb-1 mb-3">Work Summary</h2>
        {report.work_completed && (
          <div className="mb-2">
            <span className="font-semibold">Work Completed:</span>
            <p className="text-sm whitespace-pre-wrap">{report.work_completed}</p>
          </div>
        )}
        {report.observations && (
          <div className="mb-2">
            <span className="font-semibold">Observations:</span>
            <p className="text-sm whitespace-pre-wrap">{report.observations}</p>
          </div>
        )}
        {report.issues && (
          <div className="mb-2">
            <span className="font-semibold text-red-600">Issues:</span>
            <p className="text-sm whitespace-pre-wrap">{report.issues}</p>
          </div>
        )}
      </section>

      {/* Workforce Section */}
      {workforce.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-bold border-b border-gray-400 pb-1 mb-3">
            Workforce ({report.total_workers || workforce.length} workers)
          </h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1 text-left">Type</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Name/Team</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Trade</th>
                <th className="border border-gray-300 px-2 py-1 text-center">Count</th>
                <th className="border border-gray-300 px-2 py-1 text-center">Hours</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Activity</th>
              </tr>
            </thead>
            <tbody>
              {workforce.map((entry, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-300 px-2 py-1 capitalize">{entry.entry_type}</td>
                  <td className="border border-gray-300 px-2 py-1">
                    {entry.entry_type === 'team' ? entry.team_name : entry.worker_name}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">{entry.trade || '-'}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {entry.worker_count || 1}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {entry.hours_worked || '-'}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">{entry.activity || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Equipment Section */}
      {equipment.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-bold border-b border-gray-400 pb-1 mb-3">Equipment</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1 text-left">Type</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Description</th>
                <th className="border border-gray-300 px-2 py-1 text-center">Qty</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Owner</th>
                <th className="border border-gray-300 px-2 py-1 text-center">Hours</th>
              </tr>
            </thead>
            <tbody>
              {equipment.map((entry, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-300 px-2 py-1">{entry.equipment_type}</td>
                  <td className="border border-gray-300 px-2 py-1">{entry.equipment_description || '-'}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{entry.quantity}</td>
                  <td className="border border-gray-300 px-2 py-1">{entry.owner || '-'}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{entry.hours_used || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Deliveries Section */}
      {deliveries.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-bold border-b border-gray-400 pb-1 mb-3">Deliveries</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1 text-left">Material</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Vendor</th>
                <th className="border border-gray-300 px-2 py-1 text-center">Qty</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Ticket #</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Time</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((entry, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-300 px-2 py-1">{entry.material_description}</td>
                  <td className="border border-gray-300 px-2 py-1">{entry.vendor || '-'}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{entry.quantity || '-'}</td>
                  <td className="border border-gray-300 px-2 py-1">{entry.delivery_ticket_number || '-'}</td>
                  <td className="border border-gray-300 px-2 py-1">{entry.delivery_time || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Visitors Section */}
      {visitors.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-bold border-b border-gray-400 pb-1 mb-3">Visitors</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1 text-left">Name</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Company</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Purpose</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Arrival</th>
                <th className="border border-gray-300 px-2 py-1 text-left">Departure</th>
              </tr>
            </thead>
            <tbody>
              {visitors.map((entry, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-300 px-2 py-1">{entry.visitor_name}</td>
                  <td className="border border-gray-300 px-2 py-1">{entry.company || '-'}</td>
                  <td className="border border-gray-300 px-2 py-1">{entry.purpose || '-'}</td>
                  <td className="border border-gray-300 px-2 py-1">{entry.arrival_time || '-'}</td>
                  <td className="border border-gray-300 px-2 py-1">{entry.departure_time || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Signature Section */}
      <section className="mt-8 pt-4 border-t border-gray-400">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="font-semibold mb-8">Submitted By:</p>
            <div className="border-b border-gray-400 mb-1"></div>
            <p className="text-sm text-gray-600">Signature / Date</p>
          </div>
          <div>
            <p className="font-semibold mb-8">Approved By:</p>
            <div className="border-b border-gray-400 mb-1"></div>
            <p className="text-sm text-gray-600">Signature / Date</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500 text-center">
        Generated on {format(new Date(), 'MMMM d, yyyy h:mm a')}
      </div>
    </div>
  )
}
