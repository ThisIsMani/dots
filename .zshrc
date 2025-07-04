# Initialization code that may require console input (password prompts, [y/n]
# confirmations, etc.) must go above this block; everything else may go below.
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi

ZINIT_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}/zinit/zinit.git"
[ ! -d $ZINIT_HOME ] && mkdir -p "$(dirname $ZINIT_HOME)"
[ ! -d $ZINIT_HOME/.git ] && git clone https://github.com/zdharma-continuum/zinit.git "$ZINIT_HOME"
source "${ZINIT_HOME}/zinit.zsh"

zinit ice depth"1" # git clone depth
zinit light romkatv/powerlevel10k

# To customize prompt, run `p10k configure` or edit ~/.p10k.zsh.
[[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh

zinit light zsh-users/zsh-autosuggestions
zinit light zsh-users/zsh-syntax-highlighting
zinit light jeffreytse/zsh-vi-mode

bindkey -e
bindkey '^[[A' history-search-backward
bindkey '^[[B' history-search-forward

# vi mode
# bindkey -v
# export KEYTIMEOUT=30
bindkey -M viins '^[[A' history-search-backward
bindkey -M viins '^[[B' history-search-forward

ZVM_VI_INSERT_ESCAPE_BINDKEY=jj

HISTSIZE=5000
HISTFILE=~/.zsh_history
SAVEHIST=$HISTSIZE
HISTDUP=erase
setopt appendhistory
setopt sharehistory
setopt hist_ignore_space
setopt hist_ignore_all_dups
setopt hist_save_no_dups
setopt hist_ignore_dups
setopt hist_find_no_dups

# Function to conditionally initialize tools
init_if_exists() {
  local cmd=$1
  shift
  if command -v "$cmd" &> /dev/null; then
    eval "$("$cmd" "$@")"
  fi
}

# Initialize tools if they exist
init_if_exists zoxide init zsh
init_if_exists thefuck --alias
init_if_exists fnm env --use-on-cd
init_if_exists fzf --zsh

nvim() {
  if [[ -d "$1" ]]; then
    command fzf --multi --preview 'bat --color=always {}' --preview-window '~3' --bind 'enter:become(nvim {})'
  else
    command nvim "$@"
  fi
}

# List directory contents
alias ls='ls --color=tty'
alias lsa='ls -lah'
alias l='ls -lah'
alias ll='ls -lh'
alias la='ls -lAh'

alias zi=__zoxide_zi

zinit pack for ls_colors
zinit pack"no-zsh-completion" for ls_colors
zinit pack"no-dir-color-swap" for ls_colors

export LS_COLORS="di=1;36:ln=35:so=32:pi=33:ex=31:bd=34;46:cd=34;43:su=30;41:sg=30;46:tw=30;42:ow=30;43"

export PATH="/opt/homebrew/bin:$HOME/go/bin:$HOME/.cargo/bin:$HOME/.local/bin:/usr/local/opt/openjdk@17/bin:$HOME/Library/Python/3.9/bin:$PATH"
export HOMEBREW_CASK_OPTS="--appdir=$HOME/Applications --caskroom=/usr/local/Caskroom"
export EDITOR='nvim'

# The next line updates PATH for the Google Cloud SDK.
if [ -f '/Users/mani.dchandra/Downloads/google-cloud-sdk/path.zsh.inc' ]; then . '/Users/mani.dchandra/Downloads/google-cloud-sdk/path.zsh.inc'; fi

# The next line enables shell command completion for gcloud.
if [ -f '/Users/mani.dchandra/Downloads/google-cloud-sdk/completion.zsh.inc' ]; then . '/Users/mani.dchandra/Downloads/google-cloud-sdk/completion.zsh.inc'; fi

alias claude="/Users/mani.dchandra/.claude/local/claude"
