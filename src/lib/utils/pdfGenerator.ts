/**
 * Shared PDF Generator Utility
 *
 * Provides a standardized way to generate PDFs across the application,
 * utilizing the centralized branding and ensuring consistent styling.
 */

import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { format } from 'date-fns';
import {
    addDocumentHeader,
    addFootersToAllPages,
    getCompanyInfo,
    addSimplifiedHeader,
    CompanyInfo,
} from './pdfBranding';

// Standard dimensions (Letter size)
export const PDF_CONSTANTS = {
    PAGE_WIDTH: 215.9, // 8.5"
    PAGE_HEIGHT: 279.4, // 11"
    MARGIN: 15,
    COLORS: {
        black: [0, 0, 0] as [number, number, number],
        darkGray: [51, 51, 51] as [number, number, number],
        mediumGray: [128, 128, 128] as [number, number, number],
        lightGray: [200, 200, 200] as [number, number, number],
        veryLightGray: [245, 245, 245] as [number, number, number],
        white: [255, 255, 255] as [number, number, number],
        headerBg: [230, 230, 230] as [number, number, number],
        headerText: [0, 51, 102] as [number, number, number],
        primary: [41, 128, 185] as [number, number, number],
        successGreen: [46, 125, 50] as [number, number, number],
        urgentRed: [211, 47, 47] as [number, number, number],
    },
};

export interface PDFGeneratorOptions {
    orientation?: 'p' | 'portrait' | 'l' | 'landscape';
    unit?: 'mm' | 'pt' | 'px' | 'in' | 'cm' | 'ex' | 'em' | 'pc';
    format?: string | number[];
}

export class PDFGenerator {
    private doc: jsPDF;
    private currentY: number;
    private contentWidth: number;
    private options: PDFGeneratorOptions;
    private documentType: string;

    constructor(options: PDFGeneratorOptions = {}) {
        this.options = {
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter',
            ...options,
        };
        this.doc = new jsPDF(this.options);
        this.currentY = PDF_CONSTANTS.MARGIN;
        this.contentWidth =
            (this.options.orientation === 'landscape' ? PDF_CONSTANTS.PAGE_HEIGHT : PDF_CONSTANTS.PAGE_WIDTH) -
            2 * PDF_CONSTANTS.MARGIN;
        this.documentType = 'DOCUMENT';
    }

    /**
     * Initialize the document with branding
     */
    async initialize(
        projectId: string,
        documentType: string,
        documentTitle: string,
        customCompanyInfo?: CompanyInfo
    ): Promise<void> {
        this.documentType = documentType;
        const gcCompany = customCompanyInfo || (await getCompanyInfo(projectId));

        this.currentY = await addDocumentHeader(this.doc, {
            gcCompany,
            documentTitle,
            documentType,
        });
    }

    /**
     * Get the underlying jsPDF instance
     */
    getJsPDF(): jsPDF {
        return this.doc;
    }

    /**
     * Get current Y position
     */
    getY(): number {
        return this.currentY;
    }

    /**
     * Set current Y position
     */
    setY(y: number): void {
        this.currentY = y;
    }

    /**
     * Check for page break and add new page if needed
     */
    checkPageBreak(neededSpace: number): void {
        const pageHeight =
            this.options.orientation === 'landscape' ? PDF_CONSTANTS.PAGE_WIDTH : PDF_CONSTANTS.PAGE_HEIGHT;

        if (this.currentY + neededSpace > pageHeight - PDF_CONSTANTS.MARGIN) {
            this.addNewPage();
        }
    }

    /**
     * Add a new page with simplified header
     */
    addNewPage(): void {
        this.doc.addPage();
        // Reset Y to margin for new page
        this.currentY = addSimplifiedHeader(
            this.doc,
            this.documentType,
            this.doc.getNumberOfPages()
        );
    }

    /**
     * Add a standardized section header
     */
    addSectionHeader(title: string): void {
        this.checkPageBreak(15);

        const { MARGIN, COLORS } = PDF_CONSTANTS;

        this.doc.setFillColor(...COLORS.headerBg);
        this.doc.rect(MARGIN, this.currentY, this.contentWidth, 6, 'F');

        this.doc.setFontSize(9);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(...COLORS.black);
        this.doc.text(title.toUpperCase(), MARGIN + 2, this.currentY + 4);

        this.currentY += 10;
    }

    /**
     * Add key-value pairs in a grid layout
     */
    addKeyValuePairs(
        pairs: { label: string; value: string; fullWidth?: boolean }[],
        columns = 2
    ): void {
        this.checkPageBreak(20);

        const { MARGIN } = PDF_CONSTANTS;
        const colWidth = this.contentWidth / columns;
        const rowHeight = 6;

        let colIndex = 0;

        this.doc.setFontSize(9);

        for (const pair of pairs) {
            if (pair.fullWidth) {
                // If we're not at start of row, move to next row first
                if (colIndex > 0) {
                    this.currentY += rowHeight;
                    colIndex = 0;
                }
            }

            const x = MARGIN + colIndex * colWidth;

            this.doc.setFont('helvetica', 'bold');
            this.doc.text(`${pair.label}:`, x, this.currentY);

            this.doc.setFont('helvetica', 'normal');
            // Calculate max width for value to wrap text
            const labelWidth = this.doc.getTextWidth(`${pair.label}: `);
            const valueMaxWidth = (pair.fullWidth ? this.contentWidth : colWidth) - labelWidth - 5;

            const valueLines = this.doc.splitTextToSize(pair.value || '-', valueMaxWidth);
            this.doc.text(valueLines, x + labelWidth, this.currentY);

            // If full width or last column, move to next row
            if (pair.fullWidth) {
                this.currentY += Math.max(rowHeight, valueLines.length * 4);
                colIndex = 0;
            } else {
                // Check if multi-line value pushed height
                // We only advance Y when completing a row, but we need to track max height
                // For simplicity in this grid helper, we assume single lines mostly or accept slight overlap if mixed
                // Better: calculate max height for the row.

                // Simple approach: Always advance column, wrap to next row if needed
                colIndex++;
                if (colIndex >= columns) {
                    colIndex = 0;
                    this.currentY += Math.max(rowHeight, valueLines.length * 4);
                }
            }
        }

        // If we finished with a partial row, advance Y
        if (colIndex > 0) {
            this.currentY += rowHeight;
        }

        this.currentY += 2; // Extra padding after section
    }

    /**
     * Add a table using jspdf-autotable
     */
    addTable(tableOptions: UserOptions): void {
        const { MARGIN, COLORS } = PDF_CONSTANTS;

        autoTable(this.doc, {
            startY: this.currentY,
            margin: { left: MARGIN, right: MARGIN },
            styles: {
                fontSize: 8,
                cellPadding: 3,
            },
            headStyles: {
                fillColor: COLORS.darkGray,
                textColor: COLORS.white,
                fontStyle: 'bold',
            },
            alternateRowStyles: {
                fillColor: COLORS.veryLightGray,
            },
            ...tableOptions,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
    }

    /**
     * Add a text paragraph
     */
    addParagraph(text: string): void {
        this.checkPageBreak(10);
        const { MARGIN } = PDF_CONSTANTS;

        this.doc.setFontSize(9);
        this.doc.setFont('helvetica', 'normal');

        const lines = this.doc.splitTextToSize(text, this.contentWidth);
        this.doc.text(lines, MARGIN, this.currentY);

        this.currentY += lines.length * 4 + 5;
    }

    /**
     * Finalize and apply footers
     */
    finalize(): void {
        addFootersToAllPages(this.doc);
    }

    /**
     * Download the PDF
     */
    download(filename: string): void {
        this.finalize();
        const blob = this.doc.output('blob');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Helper to format filename with date
     */
    static createFilename(prefix: string, projectName: string): string {
        const safeProjectName = projectName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
        const date = format(new Date(), 'yyyy-MM-dd');
        return `${prefix}_${safeProjectName}_${date}.pdf`;
    }
}
