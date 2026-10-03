# dotfiles

Managed with [chezmoi](https://www.chezmoi.io/). The chezmoi source state lives in [`home/`](home/); files outside that directory are retained only while the remaining configurations are migrated.

## Install on a new machine

Install `git`, `zsh`, and `chezmoi`, then run:

```sh
chezmoi init --apply https://github.com/thisismani/dots.git
```

The first interactive zsh session installs zinit and the configured shell plugins. Optional integrations (`fzf`, `fnm`, `thefuck`, and `zoxide`) initialize only when their commands are available.

Before applying later updates, inspect them with:

```sh
chezmoi diff
chezmoi apply
```
