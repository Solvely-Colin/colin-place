const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded", timeout: 10000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: "/Users/solvely/clawd/projects/colin-place/prototype-screenshot.png", fullPage: false });
  await browser.close();
  console.log("Screenshot saved.");
})();
