/**
 * Package Cover Sheet Component
 * Displays and generates a cover sheet for drawing packages
 */

import React, { useMemo, forwardRef } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DRAWING_DISCIPLINES,
  DRAWING_PACKAGE_TYPES,
  type DrawingPackage,
  type DrawingPackageItem,
} from '@/types/drawing';

interface PackageCoverSheetProps {
  package: DrawingPackage;
  projectName?: string;
  companyName?: string;
  companyLogoUrl?: string;
  className?: string;
  showTableOfContents?: boolean;
  showRevisionHistory?: boolean;
}

export const PackageCoverSheet = forwardRef<HTMLDivElement, PackageCoverSheetProps>(
  function PackageCoverSheet(
    {
      package: pkg,
      projectName,
      companyName,
      companyLogoUrl,
      className,
      showTableOfContents = true,
      showRevisionHistory = true,
    },
    ref
  ) {
    const packageType = DRAWING_PACKAGE_TYPES.find((t) => t.value === pkg.packageType);

    // Group items by section/discipline
    const groupedItems = useMemo(() => {
      if (!pkg.items) {return {};}

      return pkg.items
        .filter((item) => item.isIncluded)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .reduce((acc, item) => {
          const section =
            item.sectionName ||
            DRAWING_DISCIPLINES.find((d) => d.value === item.drawing?.discipline)?.label ||
            'Other';
          if (!acc[section]) {acc[section] = [];}
          acc[section].push(item);
          return acc;
        }, {} as Record<string, DrawingPackageItem[]>);
    }, [pkg.items]);

    const totalDrawings = pkg.items?.filter((item) => item.isIncluded).length || 0;

    return (
      <div
        ref={ref}
        className={cn(
          'bg-card text-foreground p-8 print:p-0',
          className
        )}
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Cover Page */}
        <div className="min-h-[11in] flex flex-col border border-input print:border-2 mb-8 print:mb-0 print:page-break-after-always">
          {/* Header with Logo */}
          <div className="flex items-center justify-between p-6 border-b border-input">
            {companyLogoUrl || pkg.coverSheetLogoUrl ? (
              <img
                src={pkg.coverSheetLogoUrl || companyLogoUrl}
                alt="Company Logo"
                className="h-16 object-contain"
              />
            ) : (
              <div className="text-xl font-bold text-secondary">
                {companyName || 'Company Name'}
              </div>
            )}
            <div className="text-right">
              <div className="text-sm text-muted">Package Number</div>
              <div className="text-lg font-mono font-bold">{pkg.packageNumber}</div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            {/* Package Type Badge */}
            <div
              className="inline-block px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wider mb-8"
              style={{
                backgroundColor: packageType?.color === 'blue' ? '#DBEAFE' :
                  packageType?.color === 'purple' ? '#EDE9FE' :
                  packageType?.color === 'green' ? '#DCFCE7' :
                  packageType?.color === 'orange' ? '#FFEDD5' : '#F3F4F6',
                color: packageType?.color === 'blue' ? '#1D4ED8' :
                  packageType?.color === 'purple' ? '#7C3AED' :
                  packageType?.color === 'green' ? '#16A34A' :
                  packageType?.color === 'orange' ? '#EA580C' : '#374151',
              }}
            >
              {packageType?.label || pkg.packageType}
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold mb-4 heading-page">
              {pkg.coverSheetTitle || projectName || 'Project Name'}
            </h1>
            {pkg.coverSheetSubtitle && (
              <h2 className="text-2xl text-secondary mb-8 heading-section">{pkg.coverSheetSubtitle}</h2>
            )}

            {/* Package Name */}
            <div className="text-xl font-semibold text-foreground mb-12">
              {pkg.name}
            </div>

            {/* Package Info Grid */}
            <div className="grid grid-cols-2 gap-x-16 gap-y-4 text-left max-w-md">
              <div>
                <div className="text-sm text-muted">Version</div>
                <div className="font-semibold">v{pkg.version}</div>
              </div>
              <div>
                <div className="text-sm text-muted">Total Drawings</div>
                <div className="font-semibold">{totalDrawings}</div>
              </div>
              <div>
                <div className="text-sm text-muted">Issue Date</div>
                <div className="font-semibold">
                  {format(new Date(pkg.createdAt), 'MMMM d, yyyy')}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted">Status</div>
                <div className="font-semibold capitalize">{pkg.status.replace('_', ' ')}</div>
              </div>
            </div>

            {/* Notes */}
            {pkg.coverSheetNotes && (
              <div className="mt-12 max-w-lg text-sm text-secondary border-t border-border pt-6">
                {pkg.coverSheetNotes}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-input text-sm text-muted">
            <div className="flex justify-between">
              <div>
                {pkg.description && (
                  <div className="max-w-md">{pkg.description}</div>
                )}
              </div>
              <div className="text-right">
                <div>Prepared by: {pkg.createdByName || 'N/A'}</div>
                {pkg.approvedByName && (
                  <div>Approved by: {pkg.approvedByName}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Table of Contents */}
        {showTableOfContents && pkg.includeToc && (
          <div className="min-h-[11in] border border-input print:border-2 mb-8 print:mb-0 print:page-break-after-always">
            <div className="p-6 border-b border-input bg-surface">
              <h2 className="text-2xl font-bold heading-section">Table of Contents</h2>
              <div className="text-sm text-muted mt-1">
                {totalDrawings} Drawing{totalDrawings !== 1 ? 's' : ''} in Package
              </div>
            </div>

            <div className="p-6">
              {Object.entries(groupedItems).map(([section, items]) => (
                <div key={section} className="mb-6">
                  <h3 className="text-lg font-semibold text-secondary mb-3 pb-2 border-b border-border heading-subsection">
                    {section}
                  </h3>
                  <table className="w-full">
                    <thead>
                      <tr className="text-sm text-muted">
                        <th className="text-left py-2 w-32">Number</th>
                        <th className="text-left py-2">Title</th>
                        <th className="text-center py-2 w-24">Revision</th>
                        <th className="text-right py-2 w-32">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr
                          key={item.id}
                          className={cn(
                            'border-b border-border',
                            index % 2 === 0 ? 'bg-surface' : ''
                          )}
                        >
                          <td className="py-2 font-mono text-sm">
                            {item.displayNumber || item.drawing?.drawingNumber || '-'}
                          </td>
                          <td className="py-2">
                            {item.displayTitle || item.drawing?.title || '-'}
                          </td>
                          <td className="py-2 text-center font-mono">
                            {item.revision?.revision || item.drawing?.currentRevision || '-'}
                          </td>
                          <td className="py-2 text-right text-sm text-muted">
                            {item.revision?.revisionDate
                              ? format(new Date(item.revision.revisionDate), 'MM/dd/yyyy')
                              : item.drawing?.currentRevisionDate
                                ? format(new Date(item.drawing.currentRevisionDate), 'MM/dd/yyyy')
                                : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-input text-xs text-disabled">
              <div className="flex justify-between">
                <span>{pkg.packageNumber}</span>
                <span>Table of Contents - Page 1 of 1</span>
                <span>{format(new Date(), 'MM/dd/yyyy')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Revision History */}
        {showRevisionHistory && pkg.includeRevisionHistory && (
          <div className="min-h-[11in] border border-input print:border-2 print:page-break-after-always">
            <div className="p-6 border-b border-input bg-surface">
              <h2 className="text-2xl font-bold heading-section">Revision History</h2>
              <div className="text-sm text-muted mt-1">
                Document revision tracking
              </div>
            </div>

            <div className="p-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-3 border border-border w-24">Version</th>
                    <th className="text-left p-3 border border-border w-32">Date</th>
                    <th className="text-left p-3 border border-border">Description</th>
                    <th className="text-left p-3 border border-border w-40">By</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 border border-border font-mono">v{pkg.version}</td>
                    <td className="p-3 border border-border">
                      {format(new Date(pkg.updatedAt), 'MM/dd/yyyy')}
                    </td>
                    <td className="p-3 border border-border">
                      {pkg.version === 1 ? 'Initial release' : 'Package revision'}
                      {pkg.approvalNotes && ` - ${pkg.approvalNotes}`}
                    </td>
                    <td className="p-3 border border-border">
                      {pkg.approvedByName || pkg.createdByName || 'System'}
                    </td>
                  </tr>
                  {/* Additional version history would be loaded from package history */}
                </tbody>
              </table>

              {/* Drawing Revisions */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-secondary mb-4 heading-subsection">
                  Drawing Revisions in Package
                </h3>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-left p-3 border border-border w-32">Drawing</th>
                      <th className="text-left p-3 border border-border w-24">Revision</th>
                      <th className="text-left p-3 border border-border w-32">Date</th>
                      <th className="text-left p-3 border border-border">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pkg.items
                      ?.filter((item) => item.isIncluded)
                      .map((item) => (
                        <tr key={item.id}>
                          <td className="p-3 border border-border font-mono text-sm">
                            {item.displayNumber || item.drawing?.drawingNumber}
                          </td>
                          <td className="p-3 border border-border font-mono">
                            {item.revision?.revision || item.drawing?.currentRevision || '-'}
                          </td>
                          <td className="p-3 border border-border text-sm">
                            {item.revision?.revisionDate
                              ? format(new Date(item.revision.revisionDate), 'MM/dd/yyyy')
                              : '-'}
                          </td>
                          <td className="p-3 border border-border text-sm text-secondary">
                            {item.revision?.revisionDescription || '-'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t border-input text-xs text-disabled">
              <div className="flex justify-between">
                <span>{pkg.packageNumber}</span>
                <span>Revision History - Page 1 of 1</span>
                <span>{format(new Date(), 'MM/dd/yyyy')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

/**
 * Generate a printable HTML string for the cover sheet
 */
export function generateCoverSheetHTML(props: PackageCoverSheetProps): string {
  const { package: pkg, projectName, companyName, companyLogoUrl } = props;
  const packageType = DRAWING_PACKAGE_TYPES.find((t) => t.value === pkg.packageType);
  const totalDrawings = pkg.items?.filter((item) => item.isIncluded).length || 0;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${pkg.name} - Drawing Package</title>
  <style>
    @page {
      size: letter;
      margin: 0.5in;
    }
    body {
      font-family: Arial, sans-serif;
      color: #111827;
      margin: 0;
      padding: 0;
    }
    .page {
      page-break-after: always;
      min-height: 10in;
      border: 2px solid #D1D5DB;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 1px solid #D1D5DB;
    }
    .logo {
      height: 64px;
      object-fit: contain;
    }
    .company-name {
      font-size: 20px;
      font-weight: bold;
      color: #374151;
    }
    .package-number {
      text-align: right;
    }
    .package-number-label {
      font-size: 12px;
      color: #6B7280;
    }
    .package-number-value {
      font-size: 18px;
      font-family: monospace;
      font-weight: bold;
    }
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 32px;
      background-color: #DBEAFE;
      color: #1D4ED8;
    }
    h1 {
      font-size: 32px;
      font-weight: bold;
      margin: 0 0 16px 0;
    }
    h2 {
      font-size: 24px;
      color: #4B5563;
      margin: 0 0 32px 0;
      font-weight: normal;
    }
    .package-name {
      font-size: 20px;
      font-weight: 600;
      color: #1F2937;
      margin-bottom: 48px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      text-align: left;
      max-width: 400px;
    }
    .info-label {
      font-size: 12px;
      color: #6B7280;
    }
    .info-value {
      font-weight: 600;
    }
    .footer {
      padding: 24px;
      border-top: 1px solid #D1D5DB;
      font-size: 12px;
      color: #6B7280;
    }
    .toc-header {
      padding: 24px;
      border-bottom: 1px solid #D1D5DB;
      background-color: #F9FAFB;
    }
    .toc-content {
      padding: 24px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #374151;
      padding-bottom: 8px;
      border-bottom: 1px solid #E5E7EB;
      margin-bottom: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      text-align: left;
      padding: 8px;
      font-size: 12px;
      color: #6B7280;
    }
    td {
      padding: 8px;
      border-bottom: 1px solid #F3F4F6;
    }
    tr:nth-child(even) {
      background-color: #F9FAFB;
    }
    .mono {
      font-family: monospace;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      ${companyLogoUrl || pkg.coverSheetLogoUrl
        ? `<img src="${pkg.coverSheetLogoUrl || companyLogoUrl}" alt="Logo" class="logo">`
        : `<div class="company-name">${companyName || 'Company Name'}</div>`
      }
      <div class="package-number">
        <div class="package-number-label">Package Number</div>
        <div class="package-number-value">${pkg.packageNumber}</div>
      </div>
    </div>
    <div class="main-content">
      <div class="badge">${packageType?.label || pkg.packageType}</div>
      <h1 className="heading-page">${pkg.coverSheetTitle || projectName || 'Project Name'}</h1>
      ${pkg.coverSheetSubtitle ? `<h2 className="heading-section">${pkg.coverSheetSubtitle}</h2>` : ''}
      <div class="package-name">${pkg.name}</div>
      <div class="info-grid">
        <div>
          <div class="info-label">Version</div>
          <div class="info-value">v${pkg.version}</div>
        </div>
        <div>
          <div class="info-label">Total Drawings</div>
          <div class="info-value">${totalDrawings}</div>
        </div>
        <div>
          <div class="info-label">Issue Date</div>
          <div class="info-value">${format(new Date(pkg.createdAt), 'MMMM d, yyyy')}</div>
        </div>
        <div>
          <div class="info-label">Status</div>
          <div class="info-value">${pkg.status.replace('_', ' ')}</div>
        </div>
      </div>
    </div>
    <div class="footer">
      Prepared by: ${pkg.createdByName || 'N/A'}
      ${pkg.approvedByName ? ` | Approved by: ${pkg.approvedByName}` : ''}
    </div>
  </div>
</body>
</html>
  `.trim();
}
