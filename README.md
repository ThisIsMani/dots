# dotfiles

Managed with [chezmoi](https://www.chezmoi.io/). The chezmoi source state lives in [`home/`](home/); files outside that directory are retained only while the remaining configurations are migrated.

## Install on a new machine

Install `git`, `zsh`, and `chezmoi`, then run:

```sh
chezmoi init --apply https://github.com/thisismani/dots.git
```

Setup asks for a **machine display name** (for example, `mac` or `dobby`). It is stored locally as `data.machineName` in `~/.config/chezmoi/chezmoi.toml`, not in Git. The prompt shows this name on a cyan segment before the directory.

Existing installations need to initialize this value after pulling this change:

```sh
git -C "$(chezmoi source-path)" pull --ff-only
chezmoi init
chezmoi diff
chezmoi apply
source ~/.p10k.zsh
```

To rename a machine later, edit `machineName` in the local chezmoi config and run `chezmoi apply`.

The first interactive zsh session installs zinit and the configured shell plugins. Optional integrations (`fzf`, `fnm`, `thefuck`, and `zoxide`) initialize only when their commands are available.

Before applying later updates, inspect them with:

```sh
chezmoi update --apply=false
chezmoi diff
chezmoi apply
```

## Pi

The source manages:

- Shared preferences and npm package declarations in `home/.chezmoitemplates/pi-settings.json`.
- Provider definitions in `models.json`, using runtime `rbw` lookups rather than stored API keys.
- Five agent definitions, sub-bar preferences, prompt-template preferences, and Hindsight configuration.
- The 27 shared skills under `~/.agents/skills`. Pi discovers these directly; no symlinks in `~/.pi/agent/skills` are needed.

`settings.json` is managed through a modify template: shared top-level fields are updated, while each machine's `theme`, `lastChangelogVersion`, and unknown fields survive. Edit the shared JSON above to change synchronized preferences; do not use `chezmoi add ~/.pi/agent/settings.json`, which would replace partial management with a whole-file snapshot.

Authentication, sessions, installed packages, caches, trust decisions, generated extension instructions, and Hindsight queues remain device-local. `.chezmoiignore` excludes known sensitive and runtime paths; still review every file before adding or committing it. The shared Hindsight config does not repair existing queue failures or change server security.

### Prepare a new machine

Install Pi and `rbw` separately. Configure `rbw` for your Bitwarden account and a suitable pinentry implementation (`pinentry-mac` on macOS; a terminal-capable pinentry on headless Linux), then run interactively:

```sh
rbw register
rbw login
rbw unlock
rbw sync
```

Enter credentials only in the prompts. Do not save master passwords or session tokens in shell configuration. Pi uses the same two Secure Notes on each machine; `rbw` unlock state is local to that machine.

After applying the dotfiles, start Pi to load its declared packages. The standard, deep, and critic agents use `xyne-box/gpt-6.1-sol`; quick and scout use `xyne-box/gpt-6-luna`. They share the Xyne provider's `rbw` lookup. Use `/reload` after changing resources in an existing Pi session.

### Validate the Pi source

```sh
python3 -m unittest discover -s tests -v
```

These tests apply the source to isolated temporary homes, checking settings preservation, credential exclusion, actual skill files, private model-file permissions, and idempotence. They never execute the API-key retrieval commands.
