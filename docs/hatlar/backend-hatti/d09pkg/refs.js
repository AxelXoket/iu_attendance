const fs = require("fs"), path = require("path");
const D = path.join(__dirname, "..");
const nm = e => String(typeof e === "string" ? e : (e.name || e.ad || "")).trim();
const ex = {};
for (const f of fs.readdirSync(D + "/spec")) { const s = JSON.parse(fs.readFileSync(D + "/spec/" + f, "utf8").replace(/^﻿/, "")); ex[s.id] = (s.exports || []).map(nm); }
const S = JSON.parse(fs.readFileSync(D + "/spec/D09.json", "utf8"));
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sections = {};
for (const k of ["tables", "endpoints", "jobs", "exports", "tests", "invariants", "state_machines", "resolved_gaps", "contradictions_resolved", "open_points"]) {
  (S[k] || []).forEach((x, i) => { const label = k + ":" + (x.name || ((x.method || "") + " " + (x.path || "")).trim() || x.id || i); sections[label] = JSON.stringify(x); });
}
const verbose = process.argv[2] === "-v";
for (const k of Object.keys(ex)) {
  if (k === "D09") continue;
  for (const n of ex[k]) {
    if (n.length < 4) continue;
    const re = new RegExp("(?<![A-Za-z0-9_])" + esc(n) + "(?![A-Za-z0-9_])", "g");
    const where = [];
    for (const [l, t] of Object.entries(sections)) { const c = (t.match(re) || []).length; if (c) where.push(l.slice(0, 70)); }
    if (where.length) console.log(k + "." + n, where.length, verbose ? "\n   " + where.join("\n   ") : "");
  }
}
