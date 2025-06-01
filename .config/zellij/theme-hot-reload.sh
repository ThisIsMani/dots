#!/bin/bash

# Zellij theme hot reload script
# Watches for changes to the Zellij config file and attempts to reload just the theme

CONFIG_FILE="/Users/mani.dchandra/.config/zellij/config.kdl"

# Make sure required tools are available
if ! command -v fswatch &> /dev/null; then
    echo "fswatch not found. Please install it with 'brew install fswatch'"
    exit 1
fi

# Extract the current theme from the config file
get_current_theme() {
    # Try to find the active theme line
    theme_line=$(grep -E '^theme\s+"[^"]+"' "$CONFIG_FILE" | head -n 1)
    if [ -n "$theme_line" ]; then
        # Extract just the theme name from quotes
        theme_name=$(echo "$theme_line" | sed -E 's/^theme\s+"([^"]+)".*/\1/')
        echo "$theme_name"
    else
        echo "default"
    fi
}

# Function to reload the theme 
reload_theme() {
    echo "Config file changed, attempting to reload theme..."
    
    # Get the current theme name
    theme_name=$(get_current_theme)
    echo "Current theme: $theme_name"
    
    # Try reloading configuration using various approaches:
    
    # Approach 1: Try using start-or-reload-plugin for the status bar
    # This might apply theme changes to the UI elements
    echo "Attempting to reload status-bar plugin..."
    zellij action start-or-reload-plugin "zellij:status-bar"
    zellij action start-or-reload-plugin "zellij:tab-bar"
    
    # Approach 2: Try dumping current layout and reapplying it
    # (This is experimental and may not work)
    echo "Attempting to refresh layout..."
    layout_file="/tmp/zellij_current_layout.kdl"
    zellij action dump-layout > "$layout_file"
    
    # Modify layout file to force refresh (add a comment)
    echo "// Refreshed at $(date)" >> "$layout_file"
    
    # Try to apply the layout (this might not work as expected)
    # zellij action new-tab --layout "$layout_file"
    
    echo "Theme reload attempts completed at $(date)"
    echo "Note: Full theme changes may require restarting Zellij"
    echo "Watching for more changes to $CONFIG_FILE..."
}

# Initial setup
echo "Starting Zellij theme hot reload watcher"
echo "Current theme: $(get_current_theme)"
echo "Watching for changes to $CONFIG_FILE..."

# Watch for file changes
fswatch -0 "$CONFIG_FILE" | while read -d "" event; do
    echo "Detected change to config file: $event"
    reload_theme
done