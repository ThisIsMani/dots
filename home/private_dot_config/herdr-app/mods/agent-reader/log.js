// Finding an agent terminal's session log, and turning the log into rows to read.
// Read only: nothing here writes to the agent or its files.
//
//   Claude Code: ~/.claude/sessions/<pid>.json names the session; its log is
//                ~/.claude/projects/<cwd, non-alphanumerics as "-">/<sessionId>.jsonl
//   pi:          ~/.pi/agent/sessions/--<cwd, "/" as "-">--/<created>_<id>.jsonl; the one this
//                pi started (created after the process did), else the newest (a resumed session)

import { exec, home, readTextFile } from "herdr";

// The log's tail that gets read: the latest part of a long conversation.
export const TAIL_BYTES = 3_000_000;
// Rows kept on screen.
const MAX_ROWS = 300;

// { kind: "claude" | "pi", path, title } for a terminal, or throws with a reason to show.
export async function locate(terminal) {
  const got = await exec("hc", ["get", terminal, "--json"], { timeout: 5000 });
  if (got.code !== 0) throw new Error(`hc get ${terminal} failed`);
  const t = JSON.parse(got.stdout);
  const fg = t.foreground ?? {};
  const app = t.status?.app ?? "";
  const argv0 = String(fg.argv?.[0] ?? "");
  if (app === "claude-code" || /claude/.test(argv0)) return claude(fg);
  if (app === "pi" || argv0 === "pi") return pi(fg);
  throw new Error("This terminal isn't running Claude Code or pi.");
}

async function claude(fg) {
  const s = JSON.parse(await readTextFile(`${home()}/.claude/sessions/${fg.pid}.json`));
  let path = `${home()}/.claude/projects/${String(s.cwd).replace(/[^a-zA-Z0-9]/g, "-")}/${s.sessionId}.jsonl`;
  if ((await exec("test", ["-f", path])).code !== 0) {
    const found = await exec("sh", ["-c", `ls "$HOME"/.claude/projects/*/'${s.sessionId}'.jsonl 2>/dev/null | head -n 1`]);
    path = found.stdout.trim();
    if (!path) throw new Error("No log yet for this Claude Code session.");
  }
  return { kind: "claude", path, title: s.name ?? "" };
}

async function pi(fg) {
  const dir = `${home()}/.pi/agent/sessions/--${String(fg.cwd).slice(1).replace(/\//g, "-")}--`;
  const ls = await exec("ls", ["-t", dir]);
  const names = ls.stdout.split("\n").filter((n) => n.endsWith(".jsonl"));
  if (!names.length) throw new Error("No pi sessions for this folder yet.");
  const started = Date.now() - (await elapsed(fg.pid));
  const created = (n) => Date.parse(n.slice(0, 24).replace(/T(\d\d)-(\d\d)-(\d\d)-(\d+)Z/, "T$1:$2:$3.$4Z"));
  // The first session this pi created; several pi in one folder each find their own.
  const mine = names.filter((n) => created(n) >= started - 10_000).sort((a, b) => created(a) - created(b));
  return { kind: "pi", path: `${dir}/${mine[0] ?? names[0]}`, title: "" };
}

// How long a process has run, in ms (ps etime: [[dd-]hh:]mm:ss).
async function elapsed(pid) {
  const r = await exec("ps", ["-o", "etime=", "-p", String(pid)]);
  const m = r.stdout.trim().match(/^(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+)$/);
  if (!m) return 0;
  const [, d = 0, h = 0, min, s] = m;
  return (((+d * 24 + +h) * 60 + +min) * 60 + +s) * 1000;
}

// The log's size in bytes (to skip rereading an unchanged log).
export async function size(path) {
  const r = await exec("stat", ["-f", "%z", path]);
  return Number(r.stdout.trim()) || 0;
}

export async function tail(path) {
  const r = await exec("tail", ["-c", String(TAIL_BYTES), path], { timeout: 10_000 });
  return r.stdout;
}

// Rows: { key, kind: "user" | "text" | "tool" | "note", text?, name?, summary?, input?, result?, error? }
export function parse(kind, text, partial) {
  const lines = text.split("\n");
  if (partial) lines.shift(); // the tail starts mid-line
  const st = { rows: [], tools: new Map(), seen: new Set() };
  for (const line of lines) {
    if (!line) continue;
    let d;
    try {
      d = JSON.parse(line);
    } catch {
      continue; // the line being written, or a cut one
    }
    if (kind === "claude") claudeRecord(st, d);
    else piRecord(st, d);
  }
  return st.rows.slice(-MAX_ROWS);
}

function push(st, row) {
  st.rows.push(row);
  return row;
}

// Text an agent's own tags wrap (system reminders, command output) isn't for reading.
function prose(s) {
  const t = String(s ?? "").trim();
  return t && !t.startsWith("<") ? t : "";
}

function resultText(c) {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map((b) => (b.type === "text" ? b.text : b.type === "image" ? "[image]" : "")).join("\n");
  return "";
}

// One line about a tool call: its description, command, file, pattern...
function summarize(input) {
  if (!input || typeof input !== "object") return "";
  const v = input.description ?? input.command ?? input.file_path ?? input.path ?? input.pattern ?? input.url ?? input.query ?? input.prompt ?? input.skill;
  return String(v ?? JSON.stringify(input)).split("\n")[0].slice(0, 200);
}

function claudeRecord(st, d) {
  if (d.isSidechain || d.isMeta) return;
  if (d.uuid) {
    if (st.seen.has(d.uuid)) return;
    st.seen.add(d.uuid);
  }
  const m = d.message;
  if (!m) return;
  if (d.type === "user") {
    const c = m.content;
    if (typeof c === "string") {
      const cmd = c.match(/<command-name>(.*?)<\/command-name>/);
      if (cmd) return push(st, { key: d.uuid, kind: "note", text: cmd[1] });
      if (c.startsWith("[Request interrupted")) return push(st, { key: d.uuid, kind: "note", text: "Interrupted" });
      const t = prose(c);
      if (t) push(st, { key: d.uuid, kind: "user", text: t });
      return;
    }
    const texts = [];
    for (const b of c ?? []) {
      if (b.type === "text" && prose(b.text)) {
        if (b.text.startsWith("[Request interrupted")) push(st, { key: `${d.uuid}-i`, kind: "note", text: "Interrupted" });
        else texts.push(b.text.trim());
      } else if (b.type === "image") texts.push("*[image]*");
      else if (b.type === "tool_result") {
        const tool = st.tools.get(b.tool_use_id);
        if (tool) {
          tool.result = resultText(b.content);
          tool.error = Boolean(b.is_error);
        }
      }
    }
    if (texts.length) push(st, { key: d.uuid, kind: "user", text: texts.join("\n\n") });
  } else if (d.type === "assistant") {
    for (const [i, b] of (m.content ?? []).entries()) {
      if (b.type === "text" && b.text?.trim()) {
        const last = st.rows[st.rows.length - 1];
        if (last?.kind === "text" && last.mid === m.id) last.text += `\n\n${b.text}`;
        else push(st, { key: `${d.uuid}-${i}`, kind: "text", text: b.text, mid: m.id });
      } else if (b.type === "tool_use") {
        st.tools.set(b.id, push(st, { key: b.id, kind: "tool", name: b.name, summary: summarize(b.input), input: b.input }));
      }
    }
  }
}

function piRecord(st, d) {
  if (d.id) {
    if (st.seen.has(d.id)) return;
    st.seen.add(d.id);
  }
  if (d.type === "custom_message" && d.display) {
    const t = String(d.content ?? "").split("\n")[0];
    if (t) push(st, { key: d.id, kind: "note", text: t });
    return;
  }
  if (d.type !== "message") return;
  const m = d.message ?? {};
  const blocks = typeof m.content === "string" ? [{ type: "text", text: m.content }] : m.content ?? [];
  if (m.role === "user") {
    const t = blocks.filter((b) => b.type === "text").map((b) => b.text).join("\n\n").trim();
    if (t) push(st, { key: d.id, kind: "user", text: t });
  } else if (m.role === "assistant") {
    for (const [i, b] of blocks.entries()) {
      if (b.type === "text" && b.text?.trim()) {
        const last = st.rows[st.rows.length - 1];
        if (last?.kind === "text" && last.mid === d.id) last.text += `\n\n${b.text}`;
        else push(st, { key: `${d.id}-${i}`, kind: "text", text: b.text, mid: d.id });
      } else if (b.type === "toolCall") {
        st.tools.set(b.id, push(st, { key: b.id, kind: "tool", name: b.name, summary: summarize(b.arguments), input: b.arguments }));
      }
    }
  } else if (m.role === "toolResult") {
    const tool = st.tools.get(m.toolCallId);
    if (tool) {
      tool.result = resultText(m.content);
      tool.error = Boolean(m.isError);
    }
  }
}
