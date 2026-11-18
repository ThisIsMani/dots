// The review's workspace: the PR's code on disk, Neovim on it, and an agent that can
// answer questions and leave draft comments (bin/review-comment) for the reviewer.
import { exec, home, appHome, readTextFile } from "herdr";

export const COMMENT_CMD = () => `${appHome()}/mods/review/bin/review-comment`;

// ---- the code under review ------------------------------------------------------------

function repoName(repo) {
  const g = repo.gitDir.replace(/\/+$/, "");
  return g.endsWith("/.git") ? g.slice(0, -5).split("/").pop() : g.split("/").pop().replace(/\.git$/, "");
}

export function worktreePath(repo, review) {
  return `${home()}/.herdr/worktrees/${repoName(repo)}/pr-${review.pr.number}`;
}

// A detached worktree at the PR's head commit; an existing one is moved there if it's clean.
export async function ensureWorktree(repo, review) {
  const dir = worktreePath(repo, review);
  const list = (await repo.git(["worktree", "list", "--porcelain"], { ok: false })).stdout;
  const exists = list.split("\n").some((l) => l === `worktree ${dir}`);
  if (exists) {
    const st = await exec("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: dir });
    if (st.code === 0 && !st.stdout.trim()) {
      const head = await exec("git", ["rev-parse", "HEAD"], { cwd: dir });
      if (head.stdout.trim() !== review.commit) {
        const r = await exec("git", ["checkout", "-q", "--detach", review.commit], { cwd: dir });
        if (r.code !== 0) throw new Error(r.stderr.trim());
      }
      return { dir, dirty: false };
    }
    return { dir, dirty: true };
  }
  await exec("mkdir", ["-p", dir.replace(/\/[^/]+$/, "")]);
  await repo.git(["worktree", "add", "--detach", dir, review.commit], { timeout: 120000 });
  return { dir, dirty: false };
}

export async function removeWorktree(repo, dir) {
  await repo.git(["worktree", "remove", dir]);
}

export async function gitDirOf(dir) {
  const r = await exec("git", ["rev-parse", "--absolute-git-dir"], { cwd: dir });
  return r.code === 0 ? r.stdout.trim() : null;
}

// ---- Neovim ---------------------------------------------------------------------------

export const nvimSocket = () => `/tmp/herdr-review-${Date.now().toString(36)}.sock`;

const lua = (s) => `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

export async function nvimOpen(sock, file, line, col = 0) {
  const code = `pcall(function() local f = ${lua(file)}; if vim.fn.expand("%:p") ~= f then vim.cmd("edit " .. vim.fn.fnameescape(f)) end; local l = math.max(1, math.min(${Math.max(1, line | 0)}, vim.api.nvim_buf_line_count(0))); local w = vim.fn.line("w0"); local h = vim.fn.line("w$"); vim.api.nvim_win_set_cursor(0, {l, ${Math.max(0, col | 0)}}); if l < w or l > h then vim.cmd("normal! zz") end; vim.cmd("redraw") end)`;
  return exec("nvim", ["--server", sock, "--remote-expr", `luaeval(${vimStr(code)})`], { timeout: 3000 });
}

const vimStr = (s) => `'${s.replace(/'/g, "''")}'`;

// Where Neovim's cursor is: { file, line } or null.
export async function nvimWhere(sock) {
  const r = await exec("nvim", ["--server", sock, "--remote-expr", `expand('%:p') . "\\n" . line('.') . "\\n" . (col('.') - 1)`], { timeout: 1500 }).catch(() => null);
  if (!r || r.code !== 0) return null;
  const [file, line, col] = r.stdout.trim().split("\n");
  return file ? { file, line: Number(line), col: Number(col) || 0 } : null;
}

// ---- the agent's drafts ---------------------------------------------------------------

// Takes what review-comment wrote since the last look (moving the file first, so nothing
// written meanwhile is lost).
export async function takeInbox(gitDir) {
  const inbox = `${gitDir}/herdr-review-inbox.jsonl`;
  const text = await readTextFile(inbox).catch(() => null);
  if (!text) return [];
  const r = await exec("sh", ["-c", 'f="$1"; t="$1.$$"; mv "$f" "$t" 2>/dev/null && cat "$t" && rm -f "$t"', "sh", inbox]);
  return r.stdout.split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

// ---- what the agent is told -----------------------------------------------------------

function what(review) {
  if (review.kind === "pr") return `pull request #${review.pr.number} "${review.pr.title}" by ${review.pr.author} (${review.pr.headRefName} → ${review.pr.baseRefName})`;
  return review.mode === "uncommitted" ? "my uncommitted changes" : `${review.title}`;
}

function diffCmd(review) {
  return review.newRev ? `git diff ${review.oldRev.slice(0, 12)} ${review.newRev.slice(0, 12)}` : `git diff ${review.oldRev === "HEAD" ? "HEAD" : review.oldRev.slice(0, 12)}`;
}

export function briefing(review, dir) {
  return [
    `You're helping me review ${what(review)}, in a code review panel next to you.`,
    `The reviewed version of the code is checked out here (${dir}). The changes under review: \`${diffCmd(review)}\`${review.kind === "local" ? " (plus untracked files)" : ""}.`,
    `I'll ask about specific lines; answer briefly and concretely. When I ask you to review, leave each comment with:`,
    `  ${COMMENT_CMD()} PATH LINE[-END] - <<'EOF'`,
    `  comment in markdown`,
    `  EOF`,
    `Line numbers are the new version's; add --old for lines the change deletes. Comment only on lines inside the diff's hunks. For a concrete fix, include a \`\`\`suggestion block with the replacement lines. Comments become drafts I approve: never post to GitHub yourself (no gh pr review / gh pr comment / gh api).`,
    `Reply "Ready." and wait for me.`,
  ].join("\n");
}

export function askPrompt(review, an, question) {
  if (!an) return question;
  if (an.file) return [`About ${an.path} (the whole file; its changes: \`${diffCmd(review)} -- ${an.path}\`):`, question].join("\n");
  const range = an.startLine != null ? `lines ${an.startLine}-${an.line}` : `line ${an.line}`;
  const side = an.side === "LEFT" ? " (old version, deleted by the change)" : "";
  return [`About ${an.path} ${range}${side}:`, "```", ...an.snippet.map((s) => s.raw), "```", question].join("\n");
}

export function reviewPrompt(review, path, focus) {
  const scope = path ? `the changes to ${path}` : "all the changes";
  return [
    `Do a review round of ${scope} (${diffCmd(review)}${path ? ` -- ${path}` : ""}). Read the surrounding code where it matters.`,
    `Leave a comment with ${COMMENT_CMD()} for each real issue: bugs, wrong edge cases, security, races, error handling, missing tests, misleading names. Skip style nits. Use a suggestion block when the fix is small and certain.`,
    review.kind === "pr" ? `Don't repeat what's already said on the PR (\`gh pr view ${review.pr.number} --comments\`).` : "",
    focus ? `Focus: ${focus}` : "",
    `When done, give me a short summary here: how many comments, and the most important one.`,
  ].filter(Boolean).join("\n");
}
