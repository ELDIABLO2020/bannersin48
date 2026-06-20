import { chromium } from "@playwright/test";

function rgbToHex(rgb) {
  if (!rgb || rgb === "transparent" || rgb === "rgba(0, 0, 0, 0)") return null;
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return rgb;
  const hex = (n) => Number(n).toString(16).padStart(2, "0");
  const base = `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`.toLowerCase();
  if (m[4] !== undefined && Number(m[4]) < 1) {
    return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${m[4]})`;
  }
  return base;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://www.housecallpro.com/", { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(2000);

for (const text of ["No, stay on this page"]) {
  const btn = page.getByRole("button", { name: text }).first();
  if (await btn.isVisible().catch(() => false)) await btn.click().catch(() => {});
}

const audit = await page.evaluate(() => {
  const rgbToHexLocal = (rgb) => {
    if (!rgb || rgb === "transparent" || rgb === "rgba(0, 0, 0, 0)") return null;
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return rgb;
    const hex = (n) => Number(n).toString(16).padStart(2, "0");
    if (m[4] !== undefined && Number(m[4]) < 1) return rgb;
    return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`.toLowerCase();
  };

  const colorCounts = new Map();
  const add = (c) => {
    if (!c) return;
    colorCounts.set(c, (colorCounts.get(c) || 0) + 1);
  };

  for (const el of document.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    add(rgbToHexLocal(cs.backgroundColor));
    add(rgbToHexLocal(cs.color));
    add(rgbToHexLocal(cs.borderTopColor));
  }

  const sorted = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);

  const ctas = [...document.querySelectorAll("a, button")]
    .filter((el) => /start free trial/i.test(el.textContent || ""))
    .slice(0, 8)
    .map((el) => {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        text: (el.textContent || "").trim().slice(0, 30),
        className: el.className,
        visible: rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight,
        bg: rgbToHexLocal(cs.backgroundColor),
        color: rgbToHexLocal(cs.color),
        border: rgbToHexLocal(cs.borderTopColor),
      };
    });

  const darkSections = [...document.querySelectorAll("section, div, footer, header")]
    .filter((el) => {
      const bg = getComputedStyle(el).backgroundColor;
      return bg && !bg.includes("255, 255, 255") && bg !== "rgba(0, 0, 0, 0)";
    })
    .slice(0, 15)
    .map((el) => ({
      tag: el.tagName,
      className: String(el.className).slice(0, 60),
      bg: rgbToHexLocal(getComputedStyle(el).backgroundColor),
    }));

  const cssHex = new Set();
  for (const sheet of [...document.styleSheets]) {
    try {
      for (const rule of [...sheet.cssRules]) {
        const text = rule.cssText || "";
        for (const m of text.matchAll(/#([0-9a-fA-F]{3,8})\b/g)) {
          cssHex.add(`#${m[1].toLowerCase()}`);
        }
      }
    } catch {
      /* cross-origin */
    }
  }

  return { topColors: sorted, ctas, darkSections, cssHex: [...cssHex].sort() };
});

console.log(JSON.stringify(audit, null, 2));
await browser.close();
