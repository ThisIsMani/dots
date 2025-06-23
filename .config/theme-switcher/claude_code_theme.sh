#!/bin/bash
# Claude Code theme switcher script
# Changes between light and dark themes

CONFIG_FILE="$HOME/.claude.json"

# Get the current theme from environment
THEME="${THEME_SWITCHER_THEME:-dark}"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Claude Code config not found at $CONFIG_FILE"
    exit 1
fi

# Use jq to update the theme in the JSON file
if command -v jq &> /dev/null; then
    # Update theme using jq
    jq ".theme = \"$THEME\"" "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
    echo "Changed Claude Code theme to: $THEME"
else
    # Fallback to sed if jq is not available
    # This is less reliable for JSON but works for simple cases
    if [ "$THEME" = "light" ]; then
        sed -i '' 's/"theme": "dark"/"theme": "light"/' "$CONFIG_FILE"
    else
        sed -i '' 's/"theme": "light"/"theme": "dark"/' "$CONFIG_FILE"
    fi
    echo "Changed Claude Code theme to: $THEME (using sed fallback)"
fi
