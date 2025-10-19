# 🌐 Solin Service URL Helper

## Quick Access to Current Application URLs

### 🚀 Get Current URLs

Run this command to get all current application URLs:

```bash
./get-service-url.sh
```

### 📋 What You'll See

```
🌐 Current Solin Application URLs:
──────────────────────────────────────
🏠 Main App:      https://9001-xxx.sandbox.novita.ai
📖 Story Page:    https://9001-xxx.sandbox.novita.ai/story  ← NEW PAGINATION FEATURE!
📅 Timeline:      https://9001-xxx.sandbox.novita.ai/timeline
🎯 Dashboard:     https://9001-xxx.sandbox.novita.ai/dashboard
💬 Voice Chat:    https://9001-xxx.sandbox.novita.ai/
```

### 🎯 Direct Page Access

- **📖 Story Page with Pagination**: Click the Story URL to test the new e-reader page turning buttons
- **💬 Solin Voice Agent**: Use the main app URL to interact with the enhanced Solin
- **📅 Timeline**: View your memories with new highlighting features

### 🔧 Technical Notes

- The script automatically detects the active development server port
- Handles multiple servers running and picks the responsive one
- Provides debugging info for troubleshooting
- Works even when ports change due to conflicts

### ⚡ Quick Commands

```bash
# Get current URLs
./get-service-url.sh

# Start development server (if not running)
npm run dev -- --host 0.0.0.0 --port 9000

# Check if server is running
ps aux | grep vite
```

This ensures you always have access to the correct, working URLs for testing your Solin application! 🎉