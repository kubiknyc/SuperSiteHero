import { Page, Locator } from '@playwright/test';
import wcagContrast from 'wcag-contrast';

/**
 * Represents a color in RGB format
 */
interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Represents a contrast violation
 */
export interface ContrastViolation {
  element: string;
  text: string;
  textColor: string;
  backgroundColor: string;
  ratio: number;
  requiredRatio: number;
  location: string;
  selector: string;
}

/**
 * Convert RGB string to hex color
 * @param rgb - RGB string like "rgb(255, 255, 255)" or "rgba(255, 255, 255, 1)"
 * @returns Hex color like "#ffffff"
 */
export function rgbToHex(rgb: string): string {
  const matches = rgb.match(/\d+/g);
  if (!matches || matches.length < 3) {
    return '#000000';
  }

  const [r, g, b] = matches.map(Number);
  return '#' + [r, g, b]
    .map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    })
    .join('');
}

/**
 * Get the actual background color of an element by traversing up the DOM
 * @param element - Playwright locator
 * @returns Background color as RGB string
 */
export async function getActualBackgroundColor(element: Locator): Promise<string> {
  return await element.evaluate((el) => {
    let current: HTMLElement | null = el as HTMLElement;
    while (current) {
      const bg = window.getComputedStyle(current).backgroundColor;
      // Check if background is not transparent
      if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        return bg;
      }
      current = current.parentElement;
    }
    // Default to white if no background found
    return 'rgb(255, 255, 255)';
  });
}

/**
 * Check if text is considered "large" by WCAG standards
 * Large text: 18pt (24px) or larger, or 14pt (18.66px) bold or larger
 * @param element - Playwright locator
 * @returns True if text is large
 */
export async function isLargeText(element: Locator): Promise<boolean> {
  return await element.evaluate((el) => {
    const style = window.getComputedStyle(el);
    const fontSize = parseFloat(style.fontSize);
    const fontWeight = parseInt(style.fontWeight) || 400;
    const isBold = fontWeight >= 700;

    // 18pt = 24px or 14pt bold = 18.66px
    return fontSize >= 24 || (fontSize >= 18.66 && isBold);
  });
}

/**
 * Get WCAG AA required contrast ratio based on text size
 * @param isLarge - Whether text is considered large
 * @returns Required contrast ratio
 */
export function getRequiredRatio(isLarge: boolean): number {
  return isLarge ? 3.0 : 4.5;
}

/**
 * Check contrast ratio for a single element
 * @param element - Playwright locator
 * @returns Violation object if contrast is insufficient, null otherwise
 */
export async function checkElementContrast(
  element: Locator
): Promise<ContrastViolation | null> {
  try {
    // Get colors
    const textColor = await element.evaluate(el =>
      window.getComputedStyle(el).color
    );
    const bgColor = await getActualBackgroundColor(element);

    // Convert to hex
    const textHex = rgbToHex(textColor);
    const bgHex = rgbToHex(bgColor);

    // Calculate contrast ratio
    const ratio = wcagContrast.hex(textHex, bgHex);

    // Determine if text is large
    const large = await isLargeText(element);
    const requiredRatio = getRequiredRatio(large);

    // Check if contrast is sufficient
    if (ratio < requiredRatio) {
      const text = (await element.textContent()) || '';
      const tagName = await element.evaluate(el => el.tagName);
      const className = await element.evaluate(el => el.className);
      const selector = await element.evaluate(el => {
        // Try to generate a useful selector
        if (el.id) {return `#${el.id}`;}
        if (el.className) {return `.${el.className.split(' ')[0]}`;}
        return el.tagName.toLowerCase();
      });

      return {
        element: tagName,
        text: text.substring(0, 100), // Truncate long text
        textColor,
        backgroundColor: bgColor,
        ratio: Math.round(ratio * 100) / 100,
        requiredRatio,
        location: className,
        selector,
      };
    }

    return null;
  } catch (error) {
    // Skip elements that can't be checked (hidden, etc.)
    return null;
  }
}

/**
 * Check contrast for all text elements on a page
 * @param page - Playwright page
 * @param selectors - Array of CSS selectors to check
 * @returns Array of contrast violations
 */
export async function checkPageContrast(
  page: Page,
  selectors: string[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'label', 'a', 'button']
): Promise<ContrastViolation[]> {
  const violations: ContrastViolation[] = [];

  for (const selector of selectors) {
    const elements = await page.locator(selector).all();

    for (const element of elements) {
      // Check if element is visible
      const isVisible = await element.isVisible().catch(() => false);
      if (!isVisible) {continue;}

      const violation = await checkElementContrast(element);
      if (violation) {
        violations.push(violation);
      }
    }
  }

  return violations;
}

/**
 * Check contrast for interactive elements (buttons, links, form controls)
 * @param page - Playwright page
 * @returns Array of contrast violations
 */
export async function checkInteractiveContrast(
  page: Page
): Promise<ContrastViolation[]> {
  const selectors = [
    'button',
    'a[href]',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    '[role="button"]',
    '[role="link"]',
    '[tabindex]:not([tabindex="-1"])',
  ];

  return await checkPageContrast(page, selectors);
}

/**
 * Check contrast for all headings
 * @param page - Playwright page
 * @returns Array of contrast violations
 */
export async function checkHeadingContrast(
  page: Page
): Promise<ContrastViolation[]> {
  return await checkPageContrast(page, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
}

/**
 * Check contrast for body text
 * @param page - Playwright page
 * @returns Array of contrast violations
 */
export async function checkBodyTextContrast(
  page: Page
): Promise<ContrastViolation[]> {
  return await checkPageContrast(page, ['p', 'span', 'div', 'li']);
}

/**
 * Check contrast for form labels
 * @param page - Playwright page
 * @returns Array of contrast violations
 */
export async function checkLabelContrast(
  page: Page
): Promise<ContrastViolation[]> {
  return await checkPageContrast(page, ['label', '[for]']);
}

/**
 * Generate a human-readable report from violations
 * @param violations - Array of contrast violations
 * @returns Formatted report string
 */
export function generateContrastReport(violations: ContrastViolation[]): string {
  if (violations.length === 0) {
    return '✅ No contrast violations found!';
  }

  let report = `❌ Found ${violations.length} contrast violation(s):\n\n`;

  violations.forEach((violation, index) => {
    report += `${index + 1}. ${violation.element} - "${violation.text}"\n`;
    report += `   Location: ${violation.location || violation.selector}\n`;
    report += `   Text Color: ${violation.textColor}\n`;
    report += `   Background: ${violation.backgroundColor}\n`;
    report += `   Ratio: ${violation.ratio}:1 (required: ${violation.requiredRatio}:1)\n`;
    report += `   Deficit: ${(violation.requiredRatio - violation.ratio).toFixed(2)}:1\n\n`;
  });

  return report;
}

/**
 * Check contrast for a specific color pair
 * @param textColor - Text color as hex
 * @param backgroundColor - Background color as hex
 * @param isLarge - Whether text is large
 * @returns Object with ratio and pass/fail status
 */
export function checkColorPair(
  textColor: string,
  backgroundColor: string,
  isLarge: boolean = false
): { ratio: number; pass: boolean; required: number } {
  const ratio = wcagContrast.hex(textColor, backgroundColor);
  const required = getRequiredRatio(isLarge);

  return {
    ratio: Math.round(ratio * 100) / 100,
    pass: ratio >= required,
    required,
  };
}

/**
 * Batch check multiple color pairs
 * @param pairs - Array of color pairs to check
 * @returns Array of results
 */
export function checkColorPairs(
  pairs: Array<{ text: string; background: string; isLarge?: boolean; label?: string }>
): Array<{
  label: string;
  ratio: number;
  pass: boolean;
  required: number;
  textColor: string;
  backgroundColor: string;
}> {
  return pairs.map(pair => {
    const result = checkColorPair(pair.text, pair.background, pair.isLarge);
    return {
      label: pair.label || `${pair.text} on ${pair.background}`,
      ...result,
      textColor: pair.text,
      backgroundColor: pair.background,
    };
  });
}
