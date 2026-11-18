// Where diffs and comments come from: git (local changes, PR commits) and GitHub (gh).
// Reads never write to the repo except fetching a PR's commits (FETCH_HEAD only, no refs).
import { exec, readTextFile } from "herdr";
import { parseDiff, addedFile } from "./diff.js";

const READ = ["--no-optional-locks", "-c", "core.fsmonitor=false", "-c", "diff.autoRefreshIndex=false", "-c", "core.quotePath=false"];
const DIFF = ["diff", "--no-color", "--no-ext-diff", "--no-textconv", "-M", "--src-prefix=a/", "--dst-prefix=b/"];

export class Repo {
  constructor(root, gitDir, on) { this.root = root; this.gitDir = gitDir; this.on = on; }

  async git(args, { ok = true, timeout } = {}) {
    const r = await exec("git", [...READ, ...args], { cwd: this.root, on: this.on, timeout });
    if (ok && r.code !== 0) throw new Error((r.stderr || r.stdout).trim() || `git ${args[0]} failed`);
    return r;
  }

  async gh(args, { timeout = 60000 } = {}) {
    const r = await exec("gh", args, { cwd: this.root, on: this.on, timeout });
    if (r.code !== 0) throw new Error(ghError(r));
    return r.stdout;
  }

  async graphql(query, vars = {}) {
    const args = ["api", "graphql", "-f", `query=${query}`];
    for (const [k, v] of Object.entries(vars)) {
      if (v === undefined || v === null) continue;
      args.push(typeof v === "string" ? "-f" : "-F", `${k}=${v}`);
    }
    const out = JSON.parse(await this.gh(args));
    if (out.errors?.length) throw new Error(out.errors.map((e) => e.message).join("; "));
    return out.data;
  }

  // Files are written with sh, so the same path works on another machine.
  async writeFile(path, text) {
    const r = await exec("sh", ["-c", 'mkdir -p "$(dirname "$2")" && printf "%s" "$1" > "$2.tmp" && mv "$2.tmp" "$2"', "sh", text, path], { on: this.on });
    if (r.code !== 0) throw new Error(r.stderr.trim() || "could not save");
  }
  readFile(path) { return readTextFile(path, { on: this.on }).catch(() => null); }

  stateDir() { return `${this.gitDir}/herdr-review`; }
}

function ghError(r) {
  const s = (r.stderr || r.stdout || "").trim();
  try { const j = JSON.parse(r.stdout); if (j.message) return `${j.message}${j.errors ? ": " + JSON.stringify(j.errors) : ""}`; } catch {}
  return s.split("\n").slice(-3).join(" ") || "gh failed";
}

// The repo around the first of `dirs` that is in one.
export async function findRepo(dirs, on) {
  for (const d of dirs) {
    try {
      const r = await exec("git", ["rev-parse", "--show-toplevel", "--path-format=absolute", "--git-common-dir"], { cwd: d, on });
      if (r.code !== 0) continue;
      const [root, gitDir] = r.stdout.trim().split("\n");
      if (root && gitDir) return new Repo(root, gitDir, on);
    } catch {}
  }
  return null;
}

// ---- the picker ----------------------------------------------------------------------

export async function localInfo(repo) {
  const [branch, status, base] = await Promise.all([
    repo.git(["branch", "--show-current"], { ok: false }),
    repo.git(["status", "--porcelain=v1", "--untracked-files=all"], { ok: false }),
    defaultBase(repo),
  ]);
  return { branch: branch.stdout.trim() || null, dirty: status.stdout.split("\n").filter(Boolean).length, base };
}

export async function defaultBase(repo) {
  const head = await repo.git(["symbolic-ref", "--short", "refs/remotes/origin/HEAD"], { ok: false });
  if (head.code === 0 && head.stdout.trim()) return head.stdout.trim();
  for (const b of ["origin/main", "origin/master", "main", "master"]) {
    const r = await repo.git(["rev-parse", "--verify", "--quiet", `${b}^{commit}`], { ok: false });
    if (r.code === 0) return b;
  }
  return null;
}

export async function listPrs(repo) {
  const fields = "number,title,author,isDraft,headRefName,baseRefName,updatedAt,additions,deletions,reviewDecision";
  const [all, mine] = await Promise.all([
    repo.gh(["pr", "list", "--limit", "60", "--json", fields]),
    repo.gh(["pr", "list", "--limit", "60", "--search", "review-requested:@me", "--json", "number"]).catch(() => "[]"),
  ]);
  const asked = new Set(JSON.parse(mine).map((p) => p.number));
  return JSON.parse(all).map((p) => ({ ...p, requested: asked.has(p.number) }));
}

// ---- loading a review ----------------------------------------------------------------

const PR_QUERY = `query($o:String!,$r:String!,$n:Int!){viewer{login}repository(owner:$o,name:$r){pullRequest(number:$n){
id number title url state isDraft body headRefOid baseRefOid baseRefName headRefName viewerDidAuthor author{login}
reviews(states:[PENDING],first:5){nodes{id viewerDidAuthor comments{totalCount}}}
files(first:100){pageInfo{hasNextPage endCursor}nodes{path viewerViewedState}}}}}`;
const FILES_QUERY = `query($o:String!,$r:String!,$n:Int!,$after:String){repository(owner:$o,name:$r){pullRequest(number:$n){
files(first:100,after:$after){pageInfo{hasNextPage endCursor}nodes{path viewerViewedState}}}}}`;
const THREADS_QUERY = `query($o:String!,$r:String!,$n:Int!,$after:String){repository(owner:$o,name:$r){pullRequest(number:$n){
reviewThreads(first:60,after:$after){pageInfo{hasNextPage endCursor}nodes{id isResolved isOutdated path line originalLine startLine originalStartLine diffSide startDiffSide subjectType viewerCanResolve viewerCanUnresolve viewerCanReply
comments(first:60){nodes{id databaseId body createdAt state url diffHunk author{login} viewerDidAuthor}}}}}}}`;

export async function prSlug(repo) {
  const out = JSON.parse(await repo.gh(["repo", "view", "--json", "nameWithOwner,url"]));
  return out.nameWithOwner;
}

export async function loadPr(repo, number) {
  const slug = await prSlug(repo);
  const [o, r] = slug.split("/");
  const data = await repo.graphql(PR_QUERY, { o, r, n: number });
  const pr = data.repository.pullRequest;
  if (!pr) throw new Error(`No pull request #${number} in ${slug}`);
  const viewed = {};
  let files = pr.files;
  for (;;) {
    for (const f of files.nodes) viewed[f.path] = f.viewerViewedState === "VIEWED";
    if (!files.pageInfo.hasNextPage) break;
    files = (await repo.graphql(FILES_QUERY, { o, r, n: number, after: files.pageInfo.endCursor })).repository.pullRequest.files;
  }
  await ensureCommits(repo, slug, pr);
  const base = (await repo.git(["merge-base", pr.baseRefOid, pr.headRefOid])).stdout.trim();
  const diff = await repo.git([...DIFF, base, pr.headRefOid], { timeout: 120000 });
  const pending = pr.reviews.nodes.find((x) => x.viewerDidAuthor) ?? null;
  return {
    kind: "pr", key: `pr-${number}`, slug, viewer: data.viewer.login,
    pr: { id: pr.id, number, title: pr.title, url: pr.url, state: pr.state, isDraft: pr.isDraft, author: pr.author?.login ?? "ghost", viewerDidAuthor: pr.viewerDidAuthor, headRefName: pr.headRefName, baseRefName: pr.baseRefName, body: pr.body, pending },
    oldRev: base, newRev: pr.headRefOid, commit: pr.headRefOid,
    files: parseDiff(diff.stdout), viewed,
  };
}

async function ensureCommits(repo, slug, pr) {
  const have = async (sha) => (await repo.git(["cat-file", "-e", `${sha}^{commit}`], { ok: false })).code === 0;
  if ((await have(pr.headRefOid)) && (await have(pr.baseRefOid))) return;
  const remotes = (await repo.git(["remote", "-v"], { ok: false })).stdout.split("\n");
  const want = slug.toLowerCase();
  const remote = remotes.map((l) => l.split(/\s+/)).find(([, url]) => url && url.toLowerCase().replace(/\.git$/, "").endsWith(want))?.[0]
    ?? `https://github.com/${slug}.git`;
  await repo.git(["fetch", "--no-tags", "--no-write-fetch-head", "--quiet", remote, `refs/pull/${pr.number}/head`, `refs/heads/${pr.baseRefName}`], { timeout: 300000 })
    .catch(() => repo.git(["fetch", "--no-tags", "--quiet", remote, `refs/pull/${pr.number}/head`, `refs/heads/${pr.baseRefName}`], { timeout: 300000 }));
  if (!(await have(pr.headRefOid))) throw new Error(`Could not fetch the PR's commits from ${remote}`);
}

export async function loadThreads(repo, slug, number) {
  const [o, r] = slug.split("/");
  const out = [];
  let after = null;
  for (;;) {
    const t = (await repo.graphql(THREADS_QUERY, { o, r, n: number, after })).repository.pullRequest.reviewThreads;
    for (const n of t.nodes) {
      out.push({
        id: n.id, resolved: n.isResolved, outdated: n.isOutdated || n.line == null, path: n.path,
        side: n.diffSide, line: n.line,
        // GitHub reports a single line as start == end with no start side.
        ...(n.startLine == null || (n.startLine === n.line && (n.startDiffSide ?? n.diffSide) === n.diffSide)
          ? { startSide: null, startLine: null } : { startSide: n.startDiffSide ?? n.diffSide, startLine: n.startLine }),
        originalLine: n.originalLine, originalStartLine: n.originalStartLine, file: n.subjectType === "FILE",
        canResolve: n.viewerCanResolve, canUnresolve: n.viewerCanUnresolve, canReply: n.viewerCanReply,
        comments: n.comments.nodes.map((c) => ({ id: c.id, dbId: c.databaseId, body: c.body, at: c.createdAt, author: c.author?.login ?? "ghost", mine: c.viewerDidAuthor, pending: c.state === "PENDING", url: c.url, diffHunk: c.diffHunk })),
      });
    }
    if (!t.pageInfo.hasNextPage) break;
    after = t.pageInfo.endCursor;
  }
  return out;
}

// Local changes: `uncommitted` (worktree vs HEAD) or `base` (worktree vs merge-base with base).
export async function loadLocal(repo, mode, baseRef) {
  const head = await repo.git(["rev-parse", "--verify", "--quiet", "HEAD^{commit}"], { ok: false });
  if (head.code !== 0) throw new Error("This repository has no commits yet");
  const branch = (await repo.git(["branch", "--show-current"], { ok: false })).stdout.trim() || "HEAD";
  let oldRev = "HEAD", title = "Uncommitted changes", subtitle = branch;
  if (mode === "base") {
    const base = baseRef || (await defaultBase(repo));
    if (!base) throw new Error("No base branch found (origin/HEAD, main or master)");
    oldRev = (await repo.git(["merge-base", base, "HEAD"])).stdout.trim();
    title = `${branch} vs ${base}`;
    subtitle = `${(await repo.git(["rev-list", "--count", `${oldRev}..HEAD`])).stdout.trim()} commits + uncommitted`;
    baseRef = base;
  }
  const [diff, untracked] = await Promise.all([
    repo.git([...DIFF, oldRev], { timeout: 120000 }),
    repo.git(["ls-files", "--others", "--exclude-standard", "-z"], { ok: false }),
  ]);
  const files = parseDiff(diff.stdout);
  for (const p of untracked.stdout.split("\0").filter(Boolean).slice(0, 500)) {
    const text = await repo.readFile(`${repo.root}/${p}`);
    files.push(text == null ? { path: p, oldPath: p, status: "A", add: 0, del: 0, binary: true, hunks: [], untracked: true } : addedFile(p, text));
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { kind: "local", mode, base: baseRef ?? null, key: mode === "base" ? `local-${branch.replace(/[^\w.-]+/g, "_")}` : "local-uncommitted", title, subtitle, oldRev, newRev: null, commit: null, files, viewed: {} };
}

// A side's whole file, as lines (null when it doesn't exist or is too big to show).
export async function fileLines(repo, review, file, side) {
  if (side === "LEFT") {
    if (file.status === "A") return [];
    const r = await repo.git(["cat-file", "blob", `${review.oldRev}:${file.oldPath ?? file.path}`], { ok: false });
    return r.code === 0 ? splitLines(r.stdout) : null;
  }
  if (file.status === "D") return [];
  if (review.newRev) {
    const r = await repo.git(["cat-file", "blob", `${review.newRev}:${file.path}`], { ok: false });
    return r.code === 0 ? splitLines(r.stdout) : null;
  }
  const text = await repo.readFile(`${repo.root}/${file.path}`);
  return text == null ? null : splitLines(text);
}
const splitLines = (t) => (t.includes("\0") ? null : t.replace(/\r?\n$/, "").split(/\r?\n/));

// ---- acting on GitHub ----------------------------------------------------------------

export async function reply(repo, review, thread, body) {
  const first = thread.comments[0];
  await repo.gh(["api", "-X", "POST", `repos/${review.slug}/pulls/${review.pr.number}/comments/${first.dbId}/replies`, "-f", `body=${body}`]);
}

export async function setResolved(repo, thread, resolved) {
  const m = resolved ? "resolveReviewThread" : "unresolveReviewThread";
  await repo.graphql(`mutation($id:ID!){${m}(input:{threadId:$id}){thread{id isResolved}}}`, { id: thread.id });
}

export async function setViewed(repo, review, path, viewed) {
  const m = viewed ? "markFileAsViewed" : "unmarkFileAsViewed";
  await repo.graphql(`mutation($id:ID!,$path:String!){${m}(input:{pullRequestId:$id,path:$path}){clientMutationId}}`, { id: review.pr.id, path });
}

const anchorArgs = (d) => {
  const a = { path: d.path, body: d.body, line: d.line, side: d.side };
  if (d.startLine != null && (d.startLine !== d.line || d.startSide !== d.side)) { a.startLine = d.startLine; a.startSide = d.startSide; }
  return a;
};

// A comment posted at once, outside any review.
export async function postSingle(repo, review, d) {
  const a = anchorArgs(d);
  const args = ["api", "-X", "POST", `repos/${review.slug}/pulls/${review.pr.number}/comments`,
    "-f", `body=${a.body}`, "-f", `commit_id=${review.commit}`, "-f", `path=${a.path}`, "-F", `line=${a.line}`, "-f", `side=${a.side}`];
  if (a.startLine != null) args.push("-F", `start_line=${a.startLine}`, "-f", `start_side=${a.startSide}`);
  await repo.gh(args);
}

// Submits drafts as one review: reuses this person's pending review on GitHub if there is one.
// `onPosted(draft)` after each comment lands, so a failure part-way keeps only the rest.
export async function submitReview(repo, review, drafts, event, body, onPosted) {
  let id = review.pr.pending?.id;
  if (!id) {
    const d = await repo.graphql(`mutation($pr:ID!,$c:GitObjectID!){addPullRequestReview(input:{pullRequestId:$pr,commitOID:$c}){pullRequestReview{id}}}`, { pr: review.pr.id, c: review.commit });
    id = d.addPullRequestReview.pullRequestReview.id;
    review.pr.pending = { id, viewerDidAuthor: true, comments: { totalCount: 0 } };
  }
  for (const d of drafts) {
    const a = anchorArgs(d);
    const multi = a.startLine != null;
    await repo.graphql(`mutation($rid:ID!,$path:String!,$body:String!,$line:Int!,$side:DiffSide!${multi ? ",$sl:Int!,$ss:DiffSide!" : ""}){
      addPullRequestReviewThread(input:{pullRequestReviewId:$rid,path:$path,body:$body,line:$line,side:$side${multi ? ",startLine:$sl,startSide:$ss" : ""},subjectType:LINE}){thread{id}}}`,
      { rid: id, path: a.path, body: a.body, line: a.line, side: a.side, sl: a.startLine, ss: a.startSide });
    await onPosted(d);
  }
  await repo.graphql(`mutation($rid:ID!,$e:PullRequestReviewEvent!,$b:String){submitPullRequestReview(input:{pullRequestReviewId:$rid,event:$e,body:$b}){pullRequestReview{id state}}}`,
    { rid: id, e: event, b: body || undefined });
  review.pr.pending = null;
}
