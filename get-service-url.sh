#!/bin/bash

# Solin Service URL Helper Script
# This script finds the running development server and provides the current public URL

echo "🔍 Checking for running development servers..."

# Find the current port being used by vite
VITE_PORTS=$(ps aux | grep -E "vite.*--port.*[0-9]+" | grep -v grep | sed -n 's/.*--port \([0-9]\+\).*/\1/p' | sort -u)
LOCAL_PORTS=$(netstat -tlnp 2>/dev/null | grep -E ":(900[0-9]|90[0-9][0-9])" | cut -d: -f2 | cut -d' ' -f1 | sort -u)

echo "📊 Process ports found: $VITE_PORTS"
echo "📊 Network ports found: $LOCAL_PORTS"

# Try to find the active port
ACTIVE_PORT=""
for PORT in $VITE_PORTS $LOCAL_PORTS; do
    if [ -n "$PORT" ] && [ "$PORT" -gt 9000 ] && [ "$PORT" -lt 9100 ]; then
        # Test if the port is responding
        if timeout 3 bash -c "echo >/dev/tcp/localhost/$PORT" 2>/dev/null; then
            ACTIVE_PORT=$PORT
            echo "✅ Found active server on port $PORT"
            break
        else
            echo "❌ Port $PORT not responding"
        fi
    fi
done

if [ -z "$ACTIVE_PORT" ]; then
    echo "❌ No active development server found!"
    echo "💡 Start the server with: npm run dev -- --host 0.0.0.0 --port 9000"
    exit 1
fi

# Construct the sandbox URL
SANDBOX_ID="iupfq84snszyjv46ge7jb-c81df28e"
SERVICE_URL="https://${ACTIVE_PORT}-${SANDBOX_ID}.sandbox.novita.ai"

echo ""
echo "🌐 Current Solin Application URLs:"
echo "──────────────────────────────────────"
echo "🏠 Main App:      $SERVICE_URL"
echo "📖 Story Page:    $SERVICE_URL/story"
echo "📅 Timeline:      $SERVICE_URL/timeline"
echo "🎯 Dashboard:     $SERVICE_URL/dashboard"
echo "💬 Voice Chat:    $SERVICE_URL/"
echo ""
echo "🔧 Development Info:"
echo "📍 Active Port:   $ACTIVE_PORT"
echo "🆔 Sandbox ID:    $SANDBOX_ID"
echo "⏰ Generated:     $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "📋 Quick Copy (Main App):"
echo "$SERVICE_URL"