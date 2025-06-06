#!/bin/bash

# RAG Contracts Library Setup Script
# This script sets up the development environment for the OndemandEnv RAG contracts

echo "🚀 Setting up RAG Contracts Library..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Verify TypeScript compilation
echo "🔧 Compiling TypeScript..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

# Run tests
echo "🧪 Running tests..."
npm test

if [ $? -eq 0 ]; then
    echo "✅ All tests passed"
else
    echo "❌ Some tests failed"
    exit 1
fi

echo ""
echo "🎉 Setup complete! Your RAG contracts library is ready."
echo ""
echo "📋 Summary:"
echo "   ✅ Dependencies installed"
echo "   ✅ TypeScript compiled successfully"
echo "   ✅ All tests passing"
echo ""
echo "📁 RAG Services configured:"
echo "   - rag-document-ingestion-service"
echo "   - rag-document-processing-service"  
echo "   - rag-embedding-service"
echo "   - rag-vector-storage-service"
echo "   - rag-knowledge-retrieval-service"
echo "   - rag-generation-service"
echo ""
echo "🚀 Next steps:"
echo "   1. Update GitHub repository configurations in src/rag-contracts.ts"
echo "   2. Configure AWS account IDs for your organization"
echo "   3. Deploy using the OndemandEnv platform"
echo ""
echo "📖 Documentation: README.md"
echo "🔧 Build: npm run build"
echo "🧪 Test: npm test" 