import { chromium } from "playwright";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3100";
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const widths = [320, 360, 375, 390, 430];
const routes = ["/", "/login", "/barbearia-nexo-demo", "/barbearia-nexo-demo/agendar", "/nao-existe-xyz", "/privacidade", "/termos"];
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
let failures = 0;

try {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
    for (const route of routes) {
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      const result = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        title: document.querySelector("h1")?.textContent?.trim() ?? "",
      }));
      const expectedStatus = route === "/nao-existe-xyz" ? 404 : 200;
      const ok = response?.status() === expectedStatus && result.document <= result.viewport && result.title.length > 0;
      if (!ok) failures++;
      console.log(`${ok ? "OK" : "FAIL"} ${width}px ${route}: HTTP ${response?.status()}, scroll ${result.document}/${result.viewport}, h1=${result.title.slice(0, 45)}`);
      if (width === 390 && ["/", "/login", "/privacidade"].includes(route)) {
        const label = route === "/" ? "home" : route.slice(1);
        await page.screenshot({ path: join(tmpdir(), `nexo-${label}-390.png`), fullPage: true });
      }
    }
    await page.close();
  }
  const page = await browser.newPage();
  const internalLinks = new Set();
  for (const route of ["/", "/login", "/privacidade", "/termos", "/contato", "/barbearia-nexo-demo"]) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    const hrefs = await page.locator("a[href]").evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href")));
    for (const href of hrefs) {
      if (!href || href === "#") { failures++; console.log(`FAIL empty link on ${route}`); continue; }
      const target = new URL(href, baseUrl);
      if (target.origin === new URL(baseUrl).origin) internalLinks.add(target.pathname);
    }
  }
  for (const path of internalLinks) {
    const response = await page.request.get(`${baseUrl}${path}`);
    if (response.status() >= 400) { failures++; console.log(`FAIL link ${path}: HTTP ${response.status()}`); }
  }
  console.log(`Checked ${internalLinks.size} internal public links`);
  await page.close();
} finally {
  await browser.close();
}

if (failures) process.exitCode = 1;
