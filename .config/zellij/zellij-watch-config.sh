#!/bin/bash

# Simple Zellij config watcher
# Just prints detected changes without reloading

CONFIG_FILE="/Users/mani.dchandra/.config/zellij/config.kdl"

# Make sure required tools are available
if ! command -v fswatch &> /dev/null; then
    echo "fswatch not found. Please install it with 'brew install fswatch'"
    exit 1
fi

echo "Starting Zellij config watcher"
echo "Watching for changes to $CONFIG_FILE..."
echo "This script will print detected changes but won't reload Zellij"

# Watch for file changes
fswatch -0 "$CONFIG_FILE" | while read -d "" event; do
    echo "===========================================" 
    echo "Detected change to config file at $(date)"
    echo "===========================================" 
    echo "You can manually reload Zellij with:"
    echo "1. Detach from current session (Ctrl+O d)"
    echo "2. Kill the session: zellij kill-session <session-name>"
    echo "3. Start a new session: zellij -s <session-name>"
done