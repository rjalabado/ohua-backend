#!/bin/bash

# Azure Pre-deployment Script
# This script installs dependencies and runs tests before deployment

echo "🚀 Starting Azure pre-deployment process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run tests
echo "🧪 Running tests..."
npm test

# Check if tests passed
if [ $? -eq 0 ]; then
    echo "✅ All tests passed! Ready for deployment."
else
    echo "❌ Tests failed! Deployment aborted."
    exit 1
fi

echo "🎉 Pre-deployment process completed successfully!"