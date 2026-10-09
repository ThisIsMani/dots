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
chezmoi diff
chezmoi apply
```
