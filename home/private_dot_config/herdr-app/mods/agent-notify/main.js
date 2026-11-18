import { View, div } from "gpui-kit";
import { agents, exec, home } from "herdr";

// macOS notifications for agents, while Herdr isn't the app in front:
//   blocked  -> "<Agent> needs you"
//   done     -> "<Agent> finished"   (Herdr only reports done when you weren't looking)
// Clicking one brings Herdr forward on that agent. When the agent moves on (you answered,
// it started working again), its notification is removed from Notification Center.
// Needs terminal-notifier (brew install terminal-notifier). Herdr plays its own sounds.
// Only agents with a pane count (agents()); sub-agents without one don't notify.
//
// Lives in the layout as an invisible floating block, like zellij-nav.

const NOTIFIER = "/opt/homebrew/bin/terminal-notifier";
const HERDR = "dev.herdr.app";
const ALERT = { blocked: "needs you", done: "finished" };

export default class AgentNotify extends View {
  init(_props, cx) {
    // Last seen status per agent address. Agents already blocked/done when this starts
    // don't notify; only changes from here on do.
    this.last = new Map(agents().map((a) => [a.address, a.status]));
    // An invisible floating block isn't redrawn when agents change, so render can't be
    // the trigger: check once a second. It only reads Herdr's live data; no redraw.
    cx.timer.every(1000, (cx) => this.check(cx));
  }

  render() {
    return div();
  }

  // Compare agents' statuses with what we saw last time.
  check(cx) {
    const changed = [];
    const now = new Map();
    for (const a of agents()) {
      now.set(a.address, a.status);
      const was = this.last.get(a.address);
      if (was !== a.status) changed.push({ a, was });
    }
    const gone = [...this.last.keys()].filter((k) => !now.has(k));
    this.last = now;
    if (changed.length || gone.length) {
      cx.spawn(async () => {
        for (const { a, was } of changed) {
          if (ALERT[a.status]) await post(a);
          else if (ALERT[was]) await clear(a.address);
        }
        for (const address of gone) await clear(address);
      });
    }
  }
}

async function post(a) {
  if (!/^[\w./-]+$/.test(a.address)) return;
  if (await herdrInFront()) return; // Herdr shows its own toast then
  const name = a.program?.name || a.app || "Agent";
  const args = [
    "-title", `${name} ${ALERT[a.status]}`,
    "-subtitle", `${a.space_name} · ${a.tab_name}`,
    "-message", a.title || " ",
    "-group", group(a.address), // one per agent: a newer one replaces it
    "-activate", HERDR,
    "-execute", `'${home()}/.local/bin/herdr-app' do agent.focus --terminal '${a.address}'`,
  ];
  try {
    await exec(NOTIFIER, args, { timeout: 10000 });
  } catch (e) {
    console.log(`agent-notify: ${e}`);
  }
}

async function clear(address) {
  try {
    await exec(NOTIFIER, ["-remove", group(address)], { timeout: 10000 });
  } catch (_) {}
}

const group = (address) => `herdr-agent-${address}`;

async function herdrInFront() {
  try {
    const r = await exec("sh", ["-c", "lsappinfo info -only bundleID \"$(lsappinfo front)\""], { timeout: 3000 });
    return r.stdout.includes(HERDR);
  } catch (_) {
    return false;
  }
}
