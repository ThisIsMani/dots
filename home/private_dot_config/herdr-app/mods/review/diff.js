// Unified diff → files and hunks; hunks + file contents → the rows the diff view draws.

const unquote = (s) => {
  if (!s.startsWith('"')) return s;
  // git's C-style quoting (diffs run with core.quotePath=false, so no UTF-8 octets).
  let out = "";
  for (let i = 1; i < s.length - 1; i++) {
    const c = s[i];
    if (c !== "\\") { out += c; continue; }
    const n = s[++i];
    if (/[0-7]/.test(n)) { out += String.fromCharCode(parseInt(s.slice(i, i + 3), 8)); i += 2; }
    else out += { n: "\n", t: "\t", r: "\r", '"': '"', "\\": "\\", a: "\x07", b: "\b", f: "\f", v: "\v" }[n] ?? n;
  }
  return out;
};
const stripPrefix = (p) => (p === "/dev/null" ? null : p.replace(/^[ab]\//, ""));

export function parseDiff(text) {
  const files = [];
  let file = null, hunk = null, old = 0, nu = 0;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("diff --git ")) {
      hunk = null;
      file = { path: null, oldPath: null, status: "M", add: 0, del: 0, binary: false, hunks: [], mode: null };
      const m = /^diff --git (".*?"|\S+) (".*?"|\S+)$/.exec(line) ?? /^diff --git a\/(.*) b\/(.*)$/.exec(line);
      if (m) { file.oldPath = stripPrefix(unquote(m[1])) ?? m[1]; file.path = stripPrefix(unquote(m[2])) ?? m[2]; }
      files.push(file);
      continue;
    }
    if (!file) continue;
    if (!hunk) {
      if (line.startsWith("new file mode")) file.status = "A";
      else if (line.startsWith("deleted file mode")) file.status = "D";
      else if (line.startsWith("rename from ")) { file.oldPath = unquote(line.slice(12)); file.status = "R"; }
      else if (line.startsWith("rename to ")) { file.path = unquote(line.slice(10)); file.status = "R"; }
      else if (line.startsWith("copy from ")) { file.oldPath = unquote(line.slice(10)); file.status = "C"; }
      else if (line.startsWith("copy to ")) { file.path = unquote(line.slice(8)); file.status = "C"; }
      else if (line.startsWith("old mode ")) file.mode = line.slice(9);
      else if (line.startsWith("new mode ")) file.mode = `${file.mode} → ${line.slice(9)}`;
      else if (line.startsWith("Binary files ") || line.startsWith("GIT binary patch")) file.binary = true;
      else if (line.startsWith("--- ")) { const p = stripPrefix(unquote(line.slice(4).replace(/\t$/, ""))); if (p) file.oldPath = p; }
      else if (line.startsWith("+++ ")) { const p = stripPrefix(unquote(line.slice(4).replace(/\t$/, ""))); if (p) file.path = p; }
    }
    const hm = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@ ?(.*)$/.exec(line);
    if (hm) {
      old = +hm[1]; nu = +hm[3];
      hunk = { oldStart: old, oldLines: hm[2] === undefined ? 1 : +hm[2], newStart: nu, newLines: hm[4] === undefined ? 1 : +hm[4], context: hm[5] ?? "", header: line, lines: [] };
      file.hunks.push(hunk);
      continue;
    }
    if (!hunk) continue;
    const k = line[0];
    if (k === "+") { hunk.lines.push({ kind: "+", old: null, new: nu++, raw: line.slice(1) }); file.add++; }
    else if (k === "-") { hunk.lines.push({ kind: "-", old: old++, new: null, raw: line.slice(1) }); file.del++; }
    else if (k === " " || (line === "" && i < lines.length - 1 && (old < hunk.oldStart + hunk.oldLines))) hunk.lines.push({ kind: " ", old: old++, new: nu++, raw: line.slice(1) });
    else if (k === "\\") { const last = hunk.lines[hunk.lines.length - 1]; if (last) last.noEol = true; }
  }
  for (const f of files) if (!f.path) f.path = f.oldPath;
  return files;
}

// A whole file's lines shown as added (untracked files).
export function addedFile(path, text) {
  const lines = text.length ? text.replace(/\n$/, "").split("\n") : [];
  return { path, oldPath: path, status: "A", add: lines.length, del: 0, binary: text.includes("\0"), mode: null, untracked: true,
    hunks: text.includes("\0") || !text.length ? [] : [{ oldStart: 0, oldLines: 0, newStart: 1, newLines: lines.length, context: "", header: `@@ -0,0 +1,${lines.length} @@`,
      lines: lines.map((raw, i) => ({ kind: "+", old: null, new: i + 1, raw })) }] };
}

export function expandTabs(s) {
  if (!s.includes("\t")) return s;
  let out = "";
  for (const c of s) out += c === "\t" ? " ".repeat(4 - (out.length % 4)) : c;
  return out;
}

// Word-level changes between two lines: [[start, end], ...] on each side, in display columns.
export function wordDiff(a, b) {
  const ta = a.match(/\w+|\s+|[^\w\s]/g) ?? [], tb = b.match(/\w+|\s+|[^\w\s]/g) ?? [];
  if (ta.length * tb.length > 60000) return null;
  const n = ta.length, m = tb.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = ta[i] === tb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ea = [], eb = [];
  let i = 0, j = 0, pa = 0, pb = 0, same = 0;
  const mark = (arr, s, e) => { if (e <= s) return; const last = arr[arr.length - 1]; if (last && last[1] === s) last[1] = e; else arr.push([s, e]); };
  while (i < n || j < m) {
    if (i < n && j < m && ta[i] === tb[j]) { same += ta[i].length; pa += ta[i++].length; pb += tb[j++].length; }
    else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) { mark(eb, pb, pb + tb[j].length); pb += tb[j++].length; }
    else { mark(ea, pa, pa + ta[i].length); pa += ta[i++].length; }
  }
  // Mostly rewritten: highlighting every word says nothing.
  if (same < 0.35 * Math.max(a.length, b.length)) return null;
  return { a: ea, b: eb };
}

const display = (line, src) => ({ ...line, text: expandTabs(line.raw ?? src ?? "") });

// Rows for one file. `ctx`: { oldLines, newLines (raw arrays or null), oldTok, newTok, expanded: {gapId: {top, bottom}} }.
// Rows: gap | line (unified) | pair (split). Each line keeps its hunk index (-1: expanded context).
export function buildRows(file, ctx, split) {
  const rows = [];
  const hunks = file.hunks;
  const nNew = ctx.newLines?.length ?? null;
  const addContext = (newFrom, newTo, delta) => {
    for (let n = newFrom; n <= newTo; n++) {
      const raw = ctx.newLines?.[n - 1] ?? "";
      lineRows([{ kind: " ", old: n + delta, new: n, raw, hunk: -1 }]);
    }
  };
  const lineRows = (lines) => {
    if (!split) { for (const l of lines) rows.push({ type: "line", ...l }); return; }
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (l.kind === " ") { rows.push({ type: "pair", hunk: l.hunk, left: { ...l, side: "LEFT" }, right: { ...l, side: "RIGHT" } }); continue; }
      // A run of deletions, then a run of additions, side by side.
      const dels = [], adds = [];
      while (i < lines.length && lines[i].kind === "-") dels.push(lines[i++]);
      while (i < lines.length && lines[i].kind === "+") adds.push(lines[i++]);
      i--;
      for (let k = 0; k < Math.max(dels.length, adds.length); k++)
        rows.push({ type: "pair", hunk: (dels[k] ?? adds[k]).hunk, left: dels[k] ? { ...dels[k], side: "LEFT" } : null, right: adds[k] ? { ...adds[k], side: "RIGHT" } : null });
    }
  };
  let prevNewEnd = 0, prevOldEnd = 0;
  const gapAt = (id, newFrom, newTo, delta, header, last) => {
    const size = newTo - newFrom + 1;
    const ex = ctx.expanded[id] ?? { top: 0, bottom: 0 };
    const known = ctx.newLines != null;
    if (size <= 0 || !known) {
      if (header) rows.push({ type: "gap", id, size: Math.max(size, 0), header, canExpand: false });
      return;
    }
    const top = Math.min(ex.top, size), bottom = Math.min(ex.bottom, size - top);
    addContext(newFrom, newFrom + top - 1, delta);
    const rest = size - top - bottom;
    if (rest > 0) rows.push({ type: "gap", id, size: rest, header, canExpand: true, first: newFrom === 1, last, from: newFrom + top, to: newTo - bottom });
    addContext(newTo - bottom + 1, newTo, delta);
  };
  hunks.forEach((h, hi) => {
    const delta = h.oldStart - h.newStart;
    gapAt(`g${hi}`, prevNewEnd + 1, h.newStart - 1, delta, h.context ? `@@ ${h.context}` : h.header.replace(/ @@.*$/, " @@"), false);
    lineRows(h.lines.map((l) => ({ ...l, hunk: hi })));
    prevNewEnd = h.newStart + h.newLines - 1;
    prevOldEnd = h.oldStart + h.oldLines - 1;
  });
  if (hunks.length && nNew != null && nNew > prevNewEnd) gapAt("gEnd", prevNewEnd + 1, nNew, prevOldEnd - prevNewEnd, null, true);
  // Display text, syntax tokens and word-level changes.
  const tok = (side, l) => {
    const n = side === "LEFT" ? l.old : l.new, t = side === "LEFT" ? ctx.oldTok : ctx.newTok;
    return t?.[n - 1] ?? null;
  };
  const decorate = (l, side) => {
    if (!l) return null;
    l.text = expandTabs(l.raw);
    l.tok = tok(side ?? (l.kind === "-" ? "LEFT" : "RIGHT"), l);
    return l;
  };
  for (const r of rows) {
    if (r.type === "line") decorate(r);
    else if (r.type === "pair") { decorate(r.left, "LEFT"); decorate(r.right, "RIGHT"); }
  }
  // Pair each deletion with the matching addition of its change block for word emphasis.
  const pairs = [];
  if (split) for (const r of rows) { if (r.type === "pair" && r.left?.kind === "-" && r.right?.kind === "+") pairs.push([r.left, r.right]); }
  else {
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].type !== "line" || rows[i].kind !== "-") continue;
      const dels = [];
      while (i < rows.length && rows[i].type === "line" && rows[i].kind === "-") dels.push(rows[i++]);
      const adds = [];
      while (i < rows.length && rows[i].type === "line" && rows[i].kind === "+") adds.push(rows[i++]);
      i--;
      for (let k = 0; k < Math.min(dels.length, adds.length); k++) pairs.push([dels[k], adds[k]]);
    }
  }
  for (const [a, b] of pairs) {
    if (a.text.length > 1000 || b.text.length > 1000) continue;
    const w = wordDiff(a.text, b.text);
    if (w) { a.emph = w.a; b.emph = w.b; }
  }
  return rows;
}

// The lines a fallback highlighter sees when a file's contents aren't available: each side's
// diff lines in order, as {lineNo: text}.
export function sideSequences(file) {
  const oldS = new Map(), newS = new Map();
  for (const h of file.hunks) for (const l of h.lines) {
    if (l.old != null) oldS.set(l.old, l.raw);
    if (l.new != null) newS.set(l.new, l.raw);
  }
  return { oldS, newS };
}

// A comment anchor's key on one row: "L:12" / "R:15".
export const keyOf = (side, line) => `${side === "LEFT" ? "L" : "R"}:${line}`;
export function lineKey(l, side) {
  if (!l) return null;
  if (side) return side === "LEFT" ? keyOf("LEFT", l.old) : keyOf("RIGHT", l.new);
  return l.kind === "-" ? keyOf("LEFT", l.old) : keyOf("RIGHT", l.new);
}
export const parseKey = (k) => ({ side: k[0] === "L" ? "LEFT" : "RIGHT", line: Number(k.slice(2)) });

// Short, stable hash of a file's diff (local "viewed" resets when it changes).
export function diffHash(file) {
  // Files are rebuilt on every reload, so the hash can live on the object.
  if (file._hash) return file._hash;
  let h = 5381;
  for (const hk of file.hunks) for (const l of hk.lines) {
    const s = l.kind + l.raw;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return (file._hash = (h >>> 0).toString(36) + file.add + "." + file.del);
}
