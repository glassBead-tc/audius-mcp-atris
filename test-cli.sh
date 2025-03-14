#!/bin/bash

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