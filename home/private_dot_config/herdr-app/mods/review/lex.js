// A small line-at-a-time highlighter: enough to read a diff, carried across lines
// (block comments, multi-line strings). Tokens: [start, end, class].
// Classes: comment, string, number, keyword, type, function, constant, meta, tag, attr, heading.

const words = (s) => new Set(s.split(/\s+/).filter(Boolean));

const C_LIKE = { line: ["//"], block: [["/*", "*/"]], strings: ['"', "'"], types: true };

const LANGS = {
  js: { ...C_LIKE, strings: ['"', "'", "`"], multi: ["`"],
    keywords: words("async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch this throw try typeof var void while with yield as type interface enum implements private protected public readonly declare namespace abstract keyof satisfies infer is module"),
    constants: words("true false null undefined NaN Infinity") },
  rust: { ...C_LIKE, nested: true, lifetimes: true, meta: /^#!?\[[^\]]*\]?/,
    keywords: words("as async await break const continue crate dyn else enum extern fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait type unsafe use where while macro_rules union"),
    constants: words("true false None Some Ok Err") },
  go: { ...C_LIKE, strings: ['"', "'", "`"], multi: ["`"],
    keywords: words("break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var"),
    constants: words("true false nil iota") },
  c: { ...C_LIKE, meta: /^#\s*\w+/,
    keywords: words("auto break case catch class const constexpr continue default delete do else enum explicit extern final for friend goto if inline namespace new noexcept operator override private protected public return sizeof static struct switch template this throw try typedef typename union using virtual void volatile while abstract extends implements import package interface instanceof synchronized throws val var fun object when is in out data sealed companion lateinit suspend func let guard self Self struct protocol extension init deinit def lazy match trait yield async await readonly"),
    constants: words("true false null nullptr NULL nil None") },
  py: { line: ["#"], strings: ['"""', "'''", '"', "'"], multi: ['"""', "'''"], types: true, meta: /^@[\w.]+/,
    keywords: words("and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case self cls"),
    constants: words("True False None") },
  hs: { line: ["--"], block: [["{-", "-}"]], nested: true, strings: ['"'], chars: true, types: true, primes: true, meta: /^\{-#.*?#-\}/,
    keywords: words("case class data default deriving do else forall foreign if import in infix infixl infixr instance let module newtype of qualified then type where as hiding family pattern mdo proc rec derive foreign"),
    constants: words("True False Nothing Just Left Right") },
  sh: { line: ["#"], strings: ['"', "'"], multi: ['"', "'"], vars: true,
    keywords: words("if then else elif fi case esac for while until do done in function return local export readonly declare set unset shift exit break continue source alias eval exec trap echo printf cd test"),
    constants: words("true false") },
  nix: { line: ["#"], block: [["/*", "*/"]], strings: ["''", '"'], multi: ["''", '"'],
    keywords: words("let in with rec inherit if then else assert import or"),
    constants: words("true false null builtins") },
  json: { strings: ['"'], keys: true, constants: words("true false null") },
  yaml: { line: ["#"], strings: ['"', "'"], keysYaml: true, constants: words("true false null yes no on off ~") },
  toml: { line: ["#"], strings: ['"""', "'''", '"', "'"], multi: ['"""', "'''"], keysToml: true, constants: words("true false") },
  sql: { line: ["--"], block: [["/*", "*/"]], strings: ["'", '"'], caseless: true,
    keywords: words("select from where and or not insert into values update set delete create table alter add drop column index primary key foreign references unique default constraint on join left right inner outer full cross group by order having limit offset as distinct union all exists in is like between case when then else end begin commit rollback transaction returning with recursive if cascade restrict type enum varchar text integer int bigint smallint boolean bool timestamp timestamptz date jsonb json uuid serial bigserial numeric decimal real double precision array check view function trigger language plpgsql returns declare grant revoke schema extension"),
    constants: words("true false null") },
  css: { block: [["/*", "*/"]], strings: ['"', "'"], css: true, constants: words("important inherit initial unset none auto") },
  lua: { line: ["--"], block: [["--[[", "]]"]], strings: ['"', "'"],
    keywords: words("and break do else elseif end for function goto if in local not or repeat return then until while"),
    constants: words("true false nil") },
  rb: { line: ["#"], strings: ['"', "'"], types: true, meta: /^:[A-Za-z_]\w*/,
    keywords: words("alias and begin break case class def defined do else elsif end ensure for if in module next not or redo rescue retry return self super then undef unless until when while yield require attr_reader attr_accessor private protected public"),
    constants: words("true false nil") },
  ex: { line: ["#"], strings: ['"""', '"', "'"], multi: ['"""'], types: true, meta: /^:[A-Za-z_]\w*/,
    keywords: words("def defp defmodule defstruct defmacro do end fn if else unless case cond with when in import alias require use quote unquote receive after try catch rescue raise"),
    constants: words("true false nil") },
  dhall: { line: ["--"], block: [["{-", "-}"]], nested: true, strings: ['"', "''"], multi: ["''"], types: true,
    keywords: words("let in if then else as using merge missing forall with toMap showConstructor assert"),
    constants: words("True False None Some") },
  md: { markdown: true },
  html: { markup: true },
};
LANGS.purs = LANGS.hs;
LANGS.elm = LANGS.hs;

const EXT = {
  js: "js", mjs: "js", cjs: "js", jsx: "js", ts: "js", tsx: "js", mts: "js", cts: "js", vue: "js", svelte: "js",
  rs: "rust", go: "go", py: "py", pyi: "py",
  c: "c", h: "c", cc: "c", cpp: "c", cxx: "c", hpp: "c", hh: "c", m: "c", mm: "c", java: "c", kt: "c", kts: "c",
  scala: "c", sc: "c", swift: "c", cs: "c", dart: "c", groovy: "c", gradle: "c", zig: "c", proto: "c", sol: "c",
  hs: "hs", lhs: "hs", purs: "purs", elm: "elm", dhall: "dhall",
  sh: "sh", bash: "sh", zsh: "sh", fish: "sh", ksh: "sh", env: "sh",
  nix: "nix", json: "json", jsonc: "json", json5: "json", lock: "json",
  yaml: "yaml", yml: "yaml", toml: "toml", sql: "sql", psql: "sql",
  css: "css", scss: "css", sass: "css", less: "css",
  lua: "lua", rb: "rb", rake: "rb", gemspec: "rb", ex: "ex", exs: "ex",
  md: "md", markdown: "md", mdx: "md",
  html: "html", htm: "html", xml: "html", svg: "html", plist: "html", xhtml: "html",
};
const NAMES = { Dockerfile: "sh", Makefile: "sh", Justfile: "sh", justfile: "sh", ".bashrc": "sh", ".zshrc": "sh", "Cargo.lock": "toml", "flake.lock": "json" };

export function langFor(path) {
  const name = path.split("/").pop();
  if (NAMES[name]) return LANGS[NAMES[name]];
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  return LANGS[EXT[ext]] ?? null;
}

const isIdStart = (c) => /[A-Za-z_$@À-￿]/.test(c);
const isId = (c) => /[\w$À-￿]/.test(c);

// Tokenizes one line. `state` is carried to the next line: { block, depth, str }.
export function lexLine(lang, text, state) {
  const out = [];
  const st = state ?? {};
  if (!lang) return { tokens: out, state: st };
  if (lang.markdown) return { tokens: lexMarkdown(text, st), state: st };
  if (lang.markup) return { tokens: lexMarkup(text, st), state: st };
  let i = 0;
  const n = text.length;
  const push = (s, e, c) => { if (e > s) out.push([s, e, c]); };

  // Continue a block comment or multi-line string from the previous line.
  if (st.block) {
    const [open, close] = st.block;
    let j = 0;
    while (j < n) {
      if (lang.nested && text.startsWith(open, j)) { st.depth++; j += open.length; continue; }
      if (text.startsWith(close, j)) { j += close.length; if (--st.depth <= 0) { st.block = null; break; } continue; }
      j++;
    }
    push(0, j, "comment");
    i = j;
  } else if (st.str) {
    const q = st.str;
    let j = 0;
    while (j < n) {
      if (text[j] === "\\" && q !== "''") { j += 2; continue; }
      if (text.startsWith(q, j)) { j += q.length; st.str = null; break; }
      j++;
    }
    push(0, Math.min(j, n), "string");
    i = j;
  }

  while (i < n) {
    const c = text[i];
    if (c === " " || c === "\t") { i++; continue; }
    // Comments.
    if (lang.line?.some((p) => text.startsWith(p, i)) && !(lang.block?.some(([o]) => text.startsWith(o, i)))) {
      // `#` in shell only starts a comment at a word boundary.
      if (!(lang.vars && c === "#" && i > 0 && !/\s/.test(text[i - 1]))) { push(i, n, "comment"); break; }
    }
    if (lang.meta) {
      const m = lang.meta.exec(text.slice(i));
      if (m && (i === 0 || !isId(text[i - 1]))) { push(i, i + m[0].length, "meta"); i += m[0].length; continue; }
    }
    const blk = lang.block?.find(([o]) => text.startsWith(o, i));
    if (blk) {
      const [open, close] = blk;
      let j = i + open.length, depth = 1;
      while (j < n) {
        if (lang.nested && text.startsWith(open, j)) { depth++; j += open.length; continue; }
        if (text.startsWith(close, j)) { j += close.length; if (--depth === 0) break; continue; }
        j++;
      }
      if (depth > 0) { st.block = blk; st.depth = depth; }
      push(i, j, "comment");
      i = j;
      continue;
    }
    // Strings.
    const q = lang.strings?.find((s) => text.startsWith(s, i));
    if (q && !(q === "'" && (lang.lifetimes || lang.primes) && isLifetimeOrPrime(text, i, lang))) {
      let j = i + q.length, closed = false;
      while (j < n) {
        if (text[j] === "\\" && q !== "''") { j += 2; continue; }
        if (text.startsWith(q, j)) { j += q.length; closed = true; break; }
        j++;
      }
      if (!closed && lang.multi?.includes(q)) st.str = q;
      const isKey = (lang.keys && /^\s*:/.test(text.slice(j)));
      push(i, Math.min(j, n), isKey ? "attr" : "string");
      i = j;
      continue;
    }
    if (lang.lifetimes && c === "'" ) {
      const m = /^'[A-Za-z_]\w*/.exec(text.slice(i));
      if (m) { push(i, i + m[0].length, "meta"); i += m[0].length; continue; }
    }
    if (lang.vars && c === "$") {
      const m = /^\$(\{[^}]*\}|\w+|[@#?*!$0-9-])/.exec(text.slice(i));
      if (m) { push(i, i + m[0].length, "constant"); i += m[0].length; continue; }
    }
    // Numbers.
    if (/[0-9]/.test(c) && (i === 0 || !isId(text[i - 1]))) {
      const m = /^(0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|[0-9][0-9_]*(\.[0-9_]+)?([eE][+-]?[0-9]+)?)[a-zA-Z0-9_]*/.exec(text.slice(i));
      push(i, i + m[0].length, "number");
      i += m[0].length;
      continue;
    }
    // Words.
    if (isIdStart(c)) {
      let j = i + 1;
      while (j < n && (isId(text[j]) || (lang.primes && text[j] === "'") || (lang.css && text[j] === "-"))) j++;
      const w = text.slice(i, j), lw = lang.caseless ? w.toLowerCase() : w;
      const rest = text.slice(j);
      let cls = null;
      if (lang.keysYaml && /^\s*:(\s|$)/.test(rest) && /^\s*(- )?$/.test(text.slice(0, i))) cls = "attr";
      else if (lang.keysToml && /^\s*=/.test(rest) && /^\s*$/.test(text.slice(0, i))) cls = "attr";
      else if (lang.css && /^\s*:/.test(rest) && !/[{]/.test(rest)) cls = "attr";
      else if (lang.keywords?.has(lw)) cls = "keyword";
      else if (lang.constants?.has(lang.caseless ? lw : w)) cls = "constant";
      else if (/^\s*!?\s*\(/.test(rest) || (lang === LANGS.rust && /^!/.test(rest))) cls = "function";
      else if (lang.types && /^[A-Z]/.test(w)) cls = /^[A-Z][A-Z0-9_]+$/.test(w) && w.length > 1 ? "constant" : "type";
      if (cls) push(i, j, cls);
      i = j;
      continue;
    }
    i++;
  }
  return { tokens: out, state: st };
}

function isLifetimeOrPrime(text, i, lang) {
  if (lang.primes) return i > 0 && isId(text[i - 1]);
  // Rust: 'a is a lifetime unless it closes as a char literal 'a'.
  const m = /^'([A-Za-z_]\w*)/.exec(text.slice(i));
  return Boolean(m) && text[i + m[0].length] !== "'";
}

function lexMarkdown(text, st) {
  if (/^\s*(```|~~~)/.test(text)) { st.fence = !st.fence; return [[0, text.length, "meta"]]; }
  if (st.fence) return [[0, text.length, "string"]];
  if (/^#{1,6}\s/.test(text)) return [[0, text.length, "heading"]];
  const out = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))|(^\s*([-*+]|\d+\.)\s)|(^>\s?)/g;
  let m;
  while ((m = re.exec(text))) {
    const cls = m[1] ? "string" : m[2] ? "keyword" : m[3] ? "function" : "meta";
    out.push([m.index, m.index + m[0].length, cls]);
    if (m[0].length === 0) re.lastIndex++;
  }
  return out;
}

function lexMarkup(text, st) {
  const out = [];
  let i = 0;
  if (st.block) {
    const j = text.indexOf("-->");
    if (j < 0) return [[0, text.length, "comment"]];
    out.push([0, j + 3, "comment"]); st.block = null; i = j + 3;
  }
  const re = /(<!--)|(<\/?)([\w:.-]+)|([\w:-]+)(=)|("[^"]*"|'[^']*')|(\/?>)/g;
  re.lastIndex = i;
  let m;
  while ((m = re.exec(text))) {
    if (m[1]) {
      const j = text.indexOf("-->", m.index);
      if (j < 0) { out.push([m.index, text.length, "comment"]); st.block = ["<!--", "-->"]; break; }
      out.push([m.index, j + 3, "comment"]); re.lastIndex = j + 3; continue;
    }
    if (m[3]) out.push([m.index + m[2].length, m.index + m[2].length + m[3].length, "tag"]);
    else if (m[4]) out.push([m.index, m.index + m[4].length, "attr"]);
    else if (m[6]) out.push([m.index, m.index + m[6].length, "string"]);
  }
  return out;
}

// Highlights a whole file: tokens per line (index 0 = line 1).
export function lexLines(path, lines) {
  const lang = langFor(path);
  let state = {};
  return lines.map((line) => {
    const r = lexLine(lang, line, state);
    state = r.state;
    return r.tokens;
  });
}
