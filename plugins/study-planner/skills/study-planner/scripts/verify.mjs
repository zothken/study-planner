#!/usr/bin/env node
/* Study planner verification — renders the page the way the Artifact viewer does and checks it.

   node verify.mjs PLANNER.html [--state STATE.json] [--out DIR] [--click]

   - wraps the page in the same skeleton the Artifact publisher adds (standards mode)
   - stubs window.claude.use("db") with a store whose snapshots are deep-frozen, like the real one
   - renders light/desktop (1200px) and dark/phone (390px), screenshots top, timetable and catalogue
   - with --click: sets a few statuses through the UI to exercise the write path
   - prints a JSON summary; exit code 1 on page errors, duplicate keys or horizontal overflow

   Needs Playwright:  npm i playwright   (set PW_CHROMIUM to a Chromium binary if the bundled one is missing)
*/
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

let chromium;
/* find Playwright: cwd, this folder, NODE_PATH, the global npm root, common tool folders */
import { execSync } from "node:child_process";
const bases = [process.cwd(), path.dirname(new URL(import.meta.url).pathname)];
(process.env.NODE_PATH || "").split(path.delimiter).filter(Boolean).forEach(p => bases.push(p));
try { bases.push(execSync("npm root -g", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim()); } catch (e) {}
["/opt/node-tools/node_modules", path.join(process.env.HOME || "", ".npm-global/lib/node_modules")].forEach(p => bases.push(p));
for (const base of bases) {
  try { chromium = createRequire(path.join(base, "noop.js"))("playwright").chromium; break; } catch (e) {}
  try { chromium = createRequire(path.join(base, "playwright", "noop.js"))("playwright").chromium; break; } catch (e) {}
}
if (!chromium) { try { chromium = require("playwright").chromium; } catch (e) {} }
if (!chromium) { console.error("Playwright missing — run: npm i playwright (in this folder or the current one)"); process.exit(2); }

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith("--") && !["--state", "--out"].includes(args[args.indexOf(a) - 1]));
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
if (!file) { console.error("usage: node verify.mjs PLANNER.html [--state STATE.json] [--out DIR] [--click]"); process.exit(2); }
const outDir = path.resolve(opt("--out") || path.join(path.dirname(path.resolve(file)), "verify"));
const state = opt("--state") ? JSON.parse(fs.readFileSync(opt("--state"), "utf8")) : null;
const doClick = args.includes("--click");
fs.mkdirSync(outDir, { recursive: true });

let html = fs.readFileSync(file, "utf8");
html = html.replace(/^\s*<!doctype html><html><head>[\s\S]*?<\/head><body>\n?/i, "").replace(/\s*<\/body><\/html>\s*$/i, "");
const SKELETON = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;box-sizing:border-box}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#faf9f5;color:#141413}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>\n';
const wrapped = path.join(outDir, "_wrapped.html");
fs.writeFileSync(wrapped, SKELETON + html + "\n</body></html>");

const exe = process.env.PW_CHROMIUM || (fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const summary = { file: path.resolve(file), runs: [], ok: true };

for (const [scheme, width] of [["light", 1200], ["dark", 390]]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, colorScheme: scheme });
  const errors = [], consoleErr = [];
  page.on("pageerror", e => errors.push(String(e.message || e)));
  page.on("console", m => { if (m.type() === "error" && !/fonts\.g|ERR_|net::/.test(m.text())) consoleErr.push(m.text()); });
  await page.addInitScript(st => {
    const deep = o => { if (o && typeof o === "object") { Object.values(o).forEach(deep); Object.freeze(o); } return o; };
    let doc = st ? JSON.parse(JSON.stringify(st)) : null; const subs = [];
    const snap = () => ({ exists: !!doc, data: () => doc ? deep(JSON.parse(JSON.stringify(doc))) : undefined, metadata: { fromCache: false, hasPendingWrites: false } });
    const ref = { get: async () => snap(), set: async d => { doc = JSON.parse(JSON.stringify(d)); window.__dbWrites = (window.__dbWrites || 0) + 1; subs.forEach(f => f(snap())); },
      update: async d => { doc = { ...(doc || {}), ...d }; subs.forEach(f => f(snap())); }, delete: async () => { doc = null; },
      onSnapshot: (next) => { subs.push(next); setTimeout(() => next(snap()), 30); return () => {}; } };
    const db = { doc: () => ref, collection: () => ({ doc: () => ref }) };
    window.claude = { use: async n => n === "db" ? db : n === "downloads" ? { save: async () => ({ status: "saved" }) } : null };
  }, state);
  await page.goto("file://" + wrapped);
  await page.waitForTimeout(500);

  if (doClick && scheme === "light") {
    const keys = await page.$$eval("#courseGrid [data-act='st'][data-v='plan']", bs => bs.slice(0, 3).map(b => b.dataset.key));
    for (const k of keys) await page.click(`#courseGrid [data-act='st'][data-key="${k}"][data-v="plan"]`);
    const w = await page.$$eval("#courseGrid [data-act='st'][data-v='wish']", bs => bs.slice(3, 5).map(b => b.dataset.key));
    for (const k of w) await page.click(`#courseGrid [data-act='st'][data-key="${k}"][data-v="wish"]`);
    await page.waitForTimeout(200);
  }

  const info = await page.evaluate(() => {
    const P = window.PLANNER || {};
    const vis = id => { const el = document.getElementById(id); return !!el && !el.hidden; };
    return {
      lang: document.documentElement.lang,
      title: document.title,
      duplicates: (P.DUPES || []).map(d => d.key),
      sectionsVisible: [...document.querySelectorAll("section[id]")].filter(s => !s.hidden).map(s => s.id),
      catalogCards: document.querySelectorAll("#courseGrid .card").length,
      catalogCount: document.getElementById("count")?.textContent,
      patchNotes: document.querySelectorAll("#pn details").length,
      patchOpen: document.querySelectorAll("#pn details[open]").length,
      noticesShown: document.querySelectorAll(".notices .callout").length,
      timetableEvents: document.querySelectorAll("#tt .ev").length,
      bookedRed: document.querySelectorAll("#tt .ev.bad:not(.ghost)").length,
      ghostBad: document.querySelectorAll("#tt .ev.ghost.bad").length,
      clashCards: document.querySelectorAll(".card.clash").length,
      meters: [...document.querySelectorAll(".meter .mt")].map(m => m.innerText.replace(/\s+/g, " ")),
      meterWrapped: [...document.querySelectorAll(".meter .mt span")].some(s => s.getClientRects().length > 1),
      stats: [...document.querySelectorAll("#statgrid div")].map(d => d.innerText.replace(/\s+/g, " ")),
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      dbWrites: window.__dbWrites || 0,
      store: document.getElementById("storeStatus")?.textContent
    };
  });
  const shots = {};
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; });
  for (const [name, sel] of [["top", null], ["timetable", "#timetable"], ["catalog", "#catalog"], ["progress", "#progress"]]) {
    const p = path.join(outDir, `${name}-${scheme}.png`);
    if (sel) { const el = await page.$(sel); if (!el || await el.evaluate(e => e.hidden)) continue; await el.scrollIntoViewIfNeeded(); await page.evaluate(s => { document.querySelector(s).scrollIntoView(); window.scrollBy(0, -60); }, sel); }
    await page.screenshot({ path: p }); shots[name] = p;
  }
  const run = { scheme, width, errors, consoleErrors: consoleErr, ...info, screenshots: shots };
  if (errors.length || info.duplicates.length || info.overflowX || info.bookedRed) summary.ok = false;
  summary.runs.push(run);
  await page.close();
}
await browser.close();
console.log(JSON.stringify(summary, null, 1));
process.exit(summary.ok ? 0 : 1);
