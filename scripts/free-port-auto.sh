#!/bin/bash

# Script to automatically free up port 3000 (or any specified port)
# Usage: ./scripts/free-port-auto.sh [port_number]
# Default: 3000
# This version doesn't ask for confirmation - use with caution!

PORT=${1:-3000}

echo "🔍 Checking for processes using port $PORT..."

# Find processes using the port
PIDS=$(lsof -ti:$PORT 2>/dev/null)

if [ -z "$PIDS" ]; then
  echo "✅ Port $PORT is already free!"
  exit 0
fi

echo "⚠️  Found processes using port $PORT:"
lsof -i:$PORT

echo ""
echo "🔪 Automatically killing processes..."

for PID in $PIDS; do
  echo "   Killing process $PID..."
  kill -9 $PID 2>/dev/null
done

# Verify port is free
sleep 1
if lsof -ti:$PORT >/dev/null 2>&1; then
  echo "❌ Failed to free port $PORT"
  exit 1
else
  echo "✅ Port $PORT is now free!"
fi

