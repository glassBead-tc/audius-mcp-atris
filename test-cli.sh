#!/bin/bash

# Collective Intelligence Telemetry Integration
# Auto-generated on 2025-06-18 01:11:27 UTC

# Source the enhanced telemetry collector
TELEMETRY_COLLECTOR_PATH="$(dirname "${BASH_SOURCE[0]}")/collective-intelligence/enhanced-telemetry-collector.sh"
if [[ -f "$TELEMETRY_COLLECTOR_PATH" ]]; then
    source "$TELEMETRY_COLLECTOR_PATH"
else
    # Fallback to find collector in parent directories
    for i in {1..5}; do
        TELEMETRY_COLLECTOR_PATH="$(dirname "${BASH_SOURCE[0]}")$(printf '/..'%.0s {1..$i})/collective-intelligence/enhanced-telemetry-collector.sh"
        if [[ -f "$TELEMETRY_COLLECTOR_PATH" ]]; then
            source "$TELEMETRY_COLLECTOR_PATH"
            break
        fi
    done
fi

# Set script name for telemetry
export COLLECTIVE_SCRIPT_NAME="test-cli.sh"

# Original script content below
# ============================================


# Start the MCP server
echo "Starting MCP server..."
node build/debug.js &
SERVER_PID=$!

# Give the server time to start
sleep 1

# Create a payload file to send
cat > request.json << EOF
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "list_tools",
  "params": {}
}
EOF

# Send the request to the server and get the response
echo "Sending request to server..."
cat request.json | node build/debug.js > response.json

# Display the response
echo "Response received:"
cat response.json

# Clean up
echo "Cleaning up..."
rm request.json response.json
kill $SERVER_PID