// Herdr's memory, as Activity Monitor's "Memory" column counts it (macOS `footprint`):
// the window (Herdr) and herdr-core (its terminals' keeper) for the pill; with every
// terminal's processes for the dropdown (about a second over ~100 processes).

import { exec } from "herdr";

// Shared by this mod's copies (module code runs once): the pill's last reading and its dropdown.
export const cache = { ram: null, drop: null };

const UNIT = { GB: 1024, MB: 1, KB: 1 / 1024, B: 1 / 1048576 };
const mb = (n, unit) => parseFloat(n) * UNIT[unit];

// Every process: pid -> { ppid, name } (name: the executable's file name).
async function processes() {
  const r = await exec("ps", ["-axo", "pid=,ppid=,comm="], { timeout: 5000 });
  const all = new Map();
  for (const line of r.stdout.split("\n")) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+(.+)$/);
    if (m) all.set(m[1], { ppid: m[2], name: m[3].trim().split("/").pop() });
  }
  return all;
}

// footprint's report for these pids: per pid its total and its categories (MB).
async function footprint(pids) {
  if (!pids.length) return new Map();
  const r = await exec("footprint", pids.flatMap((p) => ["-p", p]), { timeout: 10000 });
  const out = new Map();
  let cur = null;
  for (const line of r.stdout.split("\n")) {
    const head = line.match(/^.+? \[(\d+)\].*Footprint: ([\d.]+) (GB|MB|KB|B)/);
    if (head) {
      cur = { total: mb(head[2], head[3]), kinds: [] };
      out.set(head[1], cur);
      continue;
    }
    if (line.startsWith("Summary")) cur = null;
    const row = cur && line.match(/^\s*([\d.]+) (GB|MB|KB|B)\s+[\d.]+ (?:GB|MB|KB|B)\s+[\d.]+ (?:GB|MB|KB|B)\s+\d+\s+(.+)$/);
    if (row && row[3] !== "TOTAL") cur.kinds.push([row[3], mb(row[1], row[2])]);
  }
  return out;
}

const isHerdr = (p) => p.name === "Herdr" || p.name === "herdr-core";

// The window's memory by kind: what it draws with, what it holds, the rest.
function kinds(app) {
  let graphics = 0, heap = 0;
  for (const [name, v] of app.kinds) {
    if (/IOAccelerator|IOSurface|\(graphics\)|CoreAnimation|CG image/.test(name)) graphics += v;
    else if (name.startsWith("MALLOC")) heap += v;
  }
  return [
    ["graphics", graphics],
    ["heap", heap],
    ["other", Math.max(0, app.total - graphics - heap)],
  ];
}

// { app, core, coreCount, kinds } in MB, or null when it can't be read. Cheap: a handful of pids.
export async function readRam() {
  const all = await processes();
  const pids = [...all].filter(([, p]) => isHerdr(p)).map(([pid]) => pid);
  const fp = await footprint(pids);
  let app = null, core = 0, coreCount = 0;
  for (const [pid, f] of fp) {
    if (all.get(pid)?.name === "Herdr") app = f;
    else (core += f.total), coreCount++;
  }
  if (!app && !coreCount) return null;
  return { app: app?.total ?? 0, core, coreCount, kinds: app ? kinds(app) : [] };
}

export function fmt(v) {
  return v >= 1024 ? `${(v / 1024).toFixed(1)} GB` : `${Math.round(v)} MB`;
}

// The full picture, for the Memory window: Herdr's own processes, then every local terminal
// with the processes it started (its pid from `hc get`), placed in its space and tab by the
// terminal's herdr.space / herdr.tab labels. `terms` is herdr's terminals(), `places` its spaces().
// Sizes are MB; every list is biggest first.
export async function readTree(terms, places) {
  const all = await processes();
  const kids = new Map();
  for (const [pid, p] of all) (kids.get(p.ppid) ?? kids.set(p.ppid, []).get(p.ppid)).push(pid);
  const subtree = (root) => {
    const out = [];
    for (const stack = [root]; stack.length; ) {
      const p = stack.pop();
      if (!all.has(p)) continue;
      out.push(p);
      stack.push(...(kids.get(p) ?? []));
    }
    return out;
  };

  // Local live terminals only: another machine's pids aren't this one's.
  const live = terms.filter((t) => t.state === "live" && !String(t.address).includes("/"));
  const info = await Promise.all(
    live.map((t) =>
      exec("hc", ["get", t.address, "--json"], { timeout: 5000 })
        .then((r) => JSON.parse(r.stdout))
        .catch(() => null),
    ),
  );
  const owned = live.map((t, i) => (info[i]?.pid ? subtree(String(info[i].pid)) : []));
  const herdrPids = [...all].filter(([, p]) => isHerdr(p)).map(([pid]) => pid);
  const fp = await footprint([...herdrPids, ...owned.flat()]);
  const size = (pid) => fp.get(pid)?.total ?? 0;
  const sum = (xs) => xs.reduce((s, x) => s + x.mb, 0);
  const byMb = (a, b) => b.mb - a.mb;

  const app = herdrPids.find((p) => all.get(p).name === "Herdr");
  const appFp = app && fp.get(app);
  const core = herdrPids.filter((p) => p !== app).map((pid) => ({ pid, mb: size(pid) })).sort(byMb);
  const herdr = {
    app: appFp?.total ?? 0,
    kinds: appFp ? kinds(appFp) : [],
    core,
    mb: (appFp?.total ?? 0) + sum(core),
  };

  // Terminals, each with its processes.
  const rows = live.map((t, i) => {
    const procs = owned[i].map((pid) => ({ pid, name: all.get(pid).name, mb: size(pid) })).sort(byMb);
    const fg = info[i]?.foreground;
    return {
      address: t.address,
      space: t.labels?.["herdr.space"] ?? null,
      tab: t.labels?.["herdr.tab"] ?? null,
      program: t.program ?? null,
      name: t.name || t.program?.name || fg?.argv?.[0] || "terminal",
      title: info[i]?.title ?? "",
      sub: Boolean(t.parent),
      procs,
      mb: sum(procs),
    };
  });

  // Spaces and tabs, in the app's names; terminals Herdr doesn't place go under "Elsewhere".
  const spacesOut = [];
  const placed = new Set();
  for (const s of places) {
    const tabs = (s.tabs ?? [])
      .map((c) => {
        const ts = rows.filter((r) => r.space === s.id.split("/").pop() && r.tab === c.id.split("/").pop());
        ts.forEach((r) => placed.add(r));
        return { id: c.id, name: c.name, terms: ts.sort(byMb), mb: sum(ts) };
      })
      .filter((c) => c.terms.length)
      .sort(byMb);
    if (tabs.length) spacesOut.push({ id: s.id, name: s.name, tabs, mb: sum(tabs) });
  }
  const loose = rows.filter((r) => !placed.has(r)).sort(byMb);
  if (loose.length) spacesOut.push({ id: "elsewhere", name: "Elsewhere", tabs: [{ id: "elsewhere-tab", name: "not in a tab", terms: loose, mb: sum(loose) }], mb: sum(loose) });
  spacesOut.sort(byMb);

  return { herdr, spaces: spacesOut, terminalsMb: sum(spacesOut), at: Date.now() };
}
