#!/bin/bash

# Zellij hot reload script
# Watches for changes to the Zellij config file and reloads Zellij when detected

CONFIG_FILE="/Users/mani.dchandra/.config/zellij/config.kdl"
SESSION_NAME="hot_reload_test"

# Function to reload Zellij
reload_zellij() {
    echo "Config file changed, reloading Zellij..."

    # Check if there's an active session
    if zellij list-sessions | grep -q "$SESSION_NAME"; then
        # Option 1: Recreate the session
        zellij kill-session "$SESSION_NAME"
        zellij -s "$SESSION_NAME"

        # Option 2: Try to reload without killing (experimental)
        # echo "Attempting to reload config for session $SESSION_NAME"
        # You could try sending specific actions here
    else
        # Start a new session
        zellij -s "$SESSION_NAME"
    fi

    echo "Zellij reloaded at $(date)"
    echo "Watching for changes to $CONFIG_FILE..."
}

# Initial load
echo "Starting Zellij hot reload watcher"
echo "Watching for changes to $CONFIG_FILE..."

# Start a session if none exists
if ! zellij list-sessions | grep -q "$SESSION_NAME"; then
    zellij -s "$SESSION_NAME" &
    sleep 1
fi
