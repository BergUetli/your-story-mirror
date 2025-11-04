# 🤖 Ollama Setup Guide for AI Design Agent

## What is Ollama?

**Ollama** lets you run powerful AI models locally on your machine - completely **FREE** with **NO API limits**!

- ✅ **100% Free** - No costs, no API keys
- ✅ **Unlimited usage** - Run as many times as you want
- ✅ **Private** - All data stays on your machine
- ✅ **Fast** - No network latency
- ✅ **Offline capable** - Works without internet (after download)

---

## 🚀 Quick Setup (Automated)

### Option 1: Use Setup Script (Easiest)

```bash
cd /home/user/webapp

# Make script executable
chmod +x setup-ollama.sh

# Run the setup script
./setup-ollama.sh
```

**What it does:**
1. ✅ Installs Ollama
2. ✅ Starts the Ollama service
3. ✅ Downloads llama3.2 model (~2GB)
4. ✅ Tests the installation
5. ✅ Confirms everything works

**Time:** ~5-10 minutes (depends on download speed)

---

## 📖 Manual Setup

### Step 1: Install Ollama

**Linux / macOS:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
Download installer from: https://ollama.ai/download/windows

### Step 2: Verify Installation
```bash
ollama --version
# Should show: ollama version is 0.x.x
```

### Step 3: Start Ollama Service
```bash
# Linux/macOS (runs in background)
ollama serve &

# Windows (runs in background automatically)
# Just open the Ollama app
```

### Step 4: Download AI Model
```bash
# Download llama3.2 (recommended, ~2GB)
ollama pull llama3.2

# Or for more powerful suggestions (larger model, ~4.7GB):
ollama pull llama3.1
```

**Download Progress:**
```
pulling manifest
pulling 8eeb52dfb3bb... 100% ████████████ 2.0 GB
pulling 73b313b5552d... 100% ████████████ 1.5 KB
pulling 0ba8f0e314b4... 100% ████████████ 12 KB
pulling 56bb8bd477a5... 100% ████████████ 96 B
pulling 1a4c3c319823... 100% ████████████ 485 B
verifying sha256 digest
writing manifest
success
```

### Step 5: Test the Model
```bash
# Test with a simple prompt
ollama run llama3.2 "Hello, can you help me improve my website design?"

# Should respond with AI-generated text
```

---

## ✅ Verify Setup

Run this to confirm everything works:

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Should return JSON with available models:
# {"models":[{"name":"llama3.2:latest",...}]}
```

---

## 🎨 Use with AI Design Agent

### Enable Ollama in the Agent

The agent is already configured! Just run:

```bash
# Terminal 1: Start dev server
cd /home/user/webapp
npm run dev

# Terminal 2: Run AI Design Agent with Ollama
npx playwright test design-ai-agent.spec.ts
```

**What happens:**
1. Agent analyzes your website design
2. Ollama AI generates specific CSS improvements
3. Suggestions saved to `testing/design-suggestions/`
4. Ready-to-use CSS code provided!

---

## 📊 Example Output with Ollama

When you run the agent with Ollama, you'll see:

```bash
🎨 AI DESIGN AGENT: Analyzing color palette...
📊 Color Analysis:
   Total unique colors: 18
   Top 5 colors:
     1. rgb(249, 249, 249) (45 times)
     2. rgb(59, 130, 246) (32 times)

🤖 Calling Ollama AI (local model)...
🧠 Model: llama3.2
⚡ Generating design suggestions...

💡 AI SUGGESTIONS:

## Consolidate Your Color Palette

Your site currently uses 18 unique colors, which creates visual 
inconsistency. Here's a systematic approach to improve it:

### Recommended Color System

```css
:root {
  /* Primary Brand Colors */
  --color-primary: #3B82F6;
  --color-primary-dark: #2563EB;
  --color-primary-light: #60A5FA;
  
  /* Neutral Colors */
  --color-bg: #F9F9F9;
  --color-text: #212121;
  --color-muted: #666666;
  
  /* Semantic Colors */
  --color-success: #10B981;
  --color-error: #EF4444;
  --color-warning: #F59E0B;
  --color-info: #3B82F6;
}

/* Before - scattered colors */
.button { background: #3B82F6; }
.header { background: #2563EB; }
.alert { background: #EF4444; }

/* After - systematic approach */
.button { background: var(--color-primary); }
.header { background: var(--color-primary-dark); }
.alert { background: var(--color-error); }
```

### Impact
**High** - This will immediately improve visual consistency across
your entire site. All colors will work harmoniously together.

### Implementation Steps
1. Add these variables to your `src/index.css`
2. Find/replace hardcoded colors with variables
3. Test on one page first to verify
4. Roll out across your site

### Benefits
- Easier to maintain (change one variable, update everywhere)
- Consistent visual language
- Faster development (reuse colors)
- Better accessibility (systematic contrast)

✅ Suggestions saved to: testing/design-suggestions/color-improvements-2025-01-04T03-15-30.md
```

---

## 🔧 Configuration Options

### Change AI Model

Edit `testing/e2e/design-ai-agent.spec.ts`:

```typescript
ollama: {
  enabled: true,
  baseUrl: 'http://localhost:11434',
  model: 'llama3.2',  // ← Change this
},
```

**Available Models:**
- `llama3.2` - Recommended, good balance (2GB)
- `llama3.1` - More powerful, better suggestions (4.7GB)
- `mistral` - Fast, concise responses (4.1GB)
- `codellama` - Specialized for code (3.8GB)

```bash
# Download other models:
ollama pull llama3.1
ollama pull mistral
ollama pull codellama
```

### Adjust Response Quality

You can modify the prompt in `design-ai-agent.spec.ts` to get:
- More detailed suggestions
- Specific focus areas
- Different output formats

---

## 🚨 Troubleshooting

### Problem: "Connection refused to localhost:11434"

**Solution:**
```bash
# Start Ollama service
ollama serve

# Or on Linux, run in background:
nohup ollama serve > /dev/null 2>&1 &
```

### Problem: "Model not found"

**Solution:**
```bash
# Download the model
ollama pull llama3.2

# Verify it's downloaded
ollama list
```

### Problem: "Ollama command not found"

**Solution:**
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Add to PATH (if needed)
export PATH=$PATH:/usr/local/bin

# Verify installation
ollama --version
```

### Problem: "Slow responses"

**Solution:**
```bash
# Use a smaller, faster model
ollama pull llama3.2

# Or if you have GPU, Ollama will use it automatically
```

### Problem: "Out of memory"

**Solution:**
```bash
# Use a smaller model
ollama pull llama3.2  # Smallest recommended

# Or adjust context window (in design-ai-agent.spec.ts)
```

---

## 💡 Pro Tips

### 1. Keep Ollama Running
```bash
# Linux/macOS - run in background on startup
echo "ollama serve &" >> ~/.bashrc

# Or use systemd service
sudo systemctl enable ollama
sudo systemctl start ollama
```

### 2. Speed Up Responses
```bash
# Preload the model (first run is slower)
ollama run llama3.2 "test"

# Now subsequent runs are instant!
```

### 3. Use Multiple Models
```bash
# Download multiple models for different use cases
ollama pull llama3.2     # Fast, good for quick suggestions
ollama pull llama3.1     # Powerful, detailed analysis
ollama pull codellama    # Best for CSS code generation

# Switch between them in design-ai-agent.spec.ts
```

### 4. Monitor Usage
```bash
# See running models
ollama ps

# Check available models
ollama list

# Remove unused models to save space
ollama rm old-model-name
```

---

## 📈 Performance Comparison

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| llama3.2 | 2GB | ⚡⚡⚡ | ⭐⭐⭐ | Quick suggestions |
| llama3.1 | 4.7GB | ⚡⚡ | ⭐⭐⭐⭐ | Detailed analysis |
| mistral | 4.1GB | ⚡⚡⚡ | ⭐⭐⭐ | Balanced |
| codellama | 3.8GB | ⚡⚡ | ⭐⭐⭐⭐ | CSS code generation |

**Recommendation:** Start with `llama3.2` for speed, upgrade to `llama3.1` if you want more detailed suggestions.

---

## 🎯 Complete Workflow

### 1. Setup (One Time)
```bash
cd /home/user/webapp
chmod +x setup-ollama.sh
./setup-ollama.sh
```

### 2. Use the AI Agent
```bash
# Terminal 1
npm run dev

# Terminal 2
npx playwright test design-ai-agent.spec.ts
```

### 3. Review Suggestions
```bash
cd testing/design-suggestions
cat COMPLETE-STYLE-GUIDE-*.md
```

### 4. Apply CSS Improvements
```bash
# Copy the generated CSS to your files
# Example: Add to src/index.css

# Test on one page first
# Then roll out across site
```

### 5. Run Again After Changes
```bash
# Make your CSS changes
# Run agent again to verify improvements

npx playwright test design-ai-agent.spec.ts
```

---

## 🌟 Benefits of Using Ollama

### vs Cloud AI (Groq, OpenAI, etc.)

| Feature | Ollama | Cloud AI |
|---------|---------|----------|
| **Cost** | FREE | May have costs |
| **API Limits** | None | Usually limited |
| **Privacy** | 100% private | Data sent to cloud |
| **Speed** | Very fast | Network latency |
| **Offline** | Works offline | Requires internet |
| **Setup** | One-time install | API keys needed |

---

## 📚 Additional Resources

**Ollama Documentation:**
https://github.com/ollama/ollama

**Available Models:**
https://ollama.ai/library

**Model Comparison:**
https://ollama.ai/blog/model-comparison

**Community:**
https://discord.gg/ollama

---

## 🎉 Summary

You now have:
- ✅ Ollama installed locally
- ✅ llama3.2 AI model ready
- ✅ AI Design Agent configured
- ✅ Unlimited, free design suggestions
- ✅ Complete privacy (no cloud)
- ✅ Fast, local processing

**Run this to get started:**
```bash
cd /home/user/webapp
npm run dev  # Terminal 1
npx playwright test design-ai-agent.spec.ts  # Terminal 2
```

**You'll get CSS improvements like:**
- Color system with variables
- Typography scale
- Spacing system
- Component improvements
- Before/after examples
- Implementation steps

**All completely FREE and unlimited!** 🚀🎨
