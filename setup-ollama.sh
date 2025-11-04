#!/bin/bash
# Ollama Setup Script for AI Design Agent
# This installs Ollama locally for FREE, unlimited AI design suggestions

set -e

echo "🤖 Setting up Ollama for AI Design Agent..."
echo ""

# Check if Ollama is already installed
if command -v ollama &> /dev/null; then
    echo "✅ Ollama is already installed!"
    ollama --version
else
    echo "📥 Installing Ollama..."
    
    # Install Ollama (works on Linux, macOS)
    curl -fsSL https://ollama.ai/install.sh | sh
    
    echo ""
    echo "✅ Ollama installed successfully!"
fi

echo ""
echo "🔍 Checking if Ollama service is running..."

# Check if Ollama is running
if ! pgrep -x "ollama" > /dev/null; then
    echo "🚀 Starting Ollama service..."
    ollama serve &
    sleep 3
fi

echo "✅ Ollama service is running!"
echo ""

# Pull the recommended model
echo "📦 Downloading AI model (llama3.2 - ~2GB)..."
echo "   This may take a few minutes depending on your connection..."
echo ""

ollama pull llama3.2

echo ""
echo "✅ Model downloaded successfully!"
echo ""

# Test the model
echo "🧪 Testing the model..."
echo ""

ollama run llama3.2 "Say 'AI Design Agent is ready!' in exactly 5 words" --verbose=false

echo ""
echo "🎉 Setup complete! Ollama is ready for AI Design Agent!"
echo ""
echo "📝 Next steps:"
echo "   1. The model is now available locally"
echo "   2. Enable Ollama in design-ai-agent.spec.ts"
echo "   3. Run: npx playwright test design-ai-agent.spec.ts"
echo ""
echo "💡 Ollama runs locally - no API keys, no limits, completely free!"
