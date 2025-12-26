/**
 * Diagnostic script to find orange buttons with contrast issues
 * Run with: node scripts/find-orange-buttons.mjs
 */

import { chromium } from '@playwright/test';

async function findOrangeButtons() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const pages = ['/', '/tasks', '/schedule', '/change-orders', '/daily-reports', '/punch-lists'];
  const allResults = [];

  for (const url of pages) {
    console.log(`\n=== Checking ${url} ===`);

    // Navigate to page
    await page.goto(`http://localhost:5173${url}`);

    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    await page.waitForTimeout(3000);

  // Find all elements with orange background
  const orangeElements = await page.evaluate(() => {
    const elements = document.querySelectorAll('*');
    const results = [];

    for (const el of elements) {
      const style = window.getComputedStyle(el);
      const bg = style.backgroundColor;

      // Check if background is orange (rgb(234, 88, 12) is orange-600)
      if (bg && (
        bg.includes('234, 88, 12') || // orange-600
        bg.includes('234,88,12') ||
        bg.includes('251, 146, 60') || // orange-400
        bg.includes('251,146,60')
      )) {
        // Get parent chain
        const parents = [];
        let current = el.parentElement;
        for (let i = 0; i < 5 && current; i++) {
          parents.push({
            tagName: current.tagName,
            className: current.className?.substring(0, 100),
            id: current.id,
          });
          current = current.parentElement;
        }

        results.push({
          tagName: el.tagName,
          id: el.id,
          className: el.className,
          textContent: el.textContent?.substring(0, 50),
          backgroundColor: bg,
          color: style.color,
          outerHTML: el.outerHTML.substring(0, 500),
          zIndex: style.zIndex,
          position: style.position,
          parents: parents,
        });
      }
    }

    return results;
  });

    if (orangeElements.length > 0) {
      console.log(`Found ${orangeElements.length} orange elements on ${url}`);
      allResults.push({ url, elements: orangeElements });
    }
  }

  console.log('\n=== ALL ORANGE ELEMENTS FOUND ===\n');
  console.log(JSON.stringify(allResults, null, 2));

  if (allResults.length > 0) {
    await page.screenshot({ path: 'orange-buttons-screenshot.png', fullPage: true });
  }

  await browser.close();
}

findOrangeButtons().catch(console.error);
