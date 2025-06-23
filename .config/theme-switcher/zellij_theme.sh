#!/bin/bash
# Zellij theme switcher script
# Changes between atom-one-light and atom-one-dark themes

# Check for stow location first, then standard location
CONFIG_FILE="$HOME/dots/.config/zellij/config.kdl"
if [ ! -f "$CONFIG_FILE" ]; then
    CONFIG_FILE="$HOME/.config/zellij/config.kdl"
fi

# Get the current theme from environment
THEME="${THEME_SWITCHER_THEME:-dark}"

# Determine the new theme
if [ "$THEME" = "light" ]; then
    NEW_THEME="atom-one-light"
else
    NEW_THEME="atom-one-dark"
fi

# Update the theme in the config file
if [ -f "$CONFIG_FILE" ]; then
    # Use sed to replace the theme line
    sed -i '' "s/^theme \".*\"/theme \"$NEW_THEME\"/" "$CONFIG_FILE"
    echo "Changed Zellij theme to: $NEW_THEME"
else
    echo "Error: Zellij config not found at $CONFIG_FILE"
    exit 1
fi

# Touch the symlink to ensure Zellij notices the change
if [ -L "$HOME/.config/zellij/config.kdl" ]; then
    touch -h "$HOME/.config/zellij/config.kdl"
fi
