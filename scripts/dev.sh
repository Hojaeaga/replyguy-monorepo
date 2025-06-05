#!/bin/bash
# ReplyGuy Development Helper Script

set -e

echo "🚀 ReplyGuy Development Setup"

# Check if .env exists, if not copy from .env.example
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "📋 Copying .env.example to .env"
        cp .env.example .env
        echo "⚠️  Please update .env with your actual configuration values"
    else
        echo "❌ No .env.example found"
        exit 1
    fi
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start development servers
echo "🔧 Starting development environment..."
echo "This will start all ReplyGuy services in development mode"

# Run turbo dev to start all services
npm run dev 