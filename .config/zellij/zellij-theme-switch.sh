#!/bin/bash

# Script to switch Zellij theme based on macOS appearance
# Meant to be called by dark-notify

CONFIG_FILE="/Users/mani.dchandra/dots/.config/zellij/config.kdl"
DARK_THEME="atom-one-dark"
LIGHT_THEME="atom-one-light"

# Check if appearance is passed as argument
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <dark|light>"
    exit 1
fi

APPEARANCE="$1"

# Get current Zellij theme from config
get_current_theme() {
    theme_line=$(grep -E 'theme\s+"[^"]+"' "$CONFIG_FILE" | head -n 1)
    if [ -n "$theme_line" ]; then
        # Extract just the theme name from between the quotes
        theme_name=$(echo "$theme_line" | awk -F '"' '{print $2}')
        echo "$theme_name"
    else
        echo "default"
    fi
}

# Set Zellij theme in config file
set_theme() {
    local new_theme=$1
    local current_theme=$(get_current_theme)

    if [ "$current_theme" != "$new_theme" ]; then
        echo "Changing Zellij theme from $current_theme to $new_theme"
        # Create a temporary file and replace the theme line
        tmp_file=$(mktemp)
        cat "$CONFIG_FILE" | sed "s/theme \"$current_theme\"/theme \"$new_theme\"/g" >"$tmp_file"
        # Move the temporary file to replace the original
        mv "$tmp_file" "$CONFIG_FILE"

        # Reload Zellij plugins to apply theme
        if pgrep -x "zellij" >/dev/null; then
            echo "Reloading Zellij plugins..."
            zellij action start-or-reload-plugin "zellij:status-bar" 2>/dev/null || true
            zellij action start-or-reload-plugin "zellij:tab-bar" 2>/dev/null || true
        else
            echo "Zellij is not running, theme will apply on next start"
        fi

        echo "Theme updated to $new_theme at $(date)"
    else
        echo "Theme already set to $new_theme, no changes needed"
    fi
}

# Set theme based on passed appearance
if [ "$APPEARANCE" = "dark" ]; then
    set_theme "$DARK_THEME"
elif [ "$APPEARANCE" = "light" ]; then
    set_theme "$LIGHT_THEME"
else
    echo "Invalid appearance: $APPEARANCE. Use 'dark' or 'light'."
    exit 1
fi

exit 0
