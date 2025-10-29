#!/bin/bash
# Test Dokploy Installation

set -e

echo "Testing Dokploy installation..."

# Test UI
echo -n "Testing UI (http://localhost:3000)... "
if curl -s -f http://localhost:3000 > /dev/null; then
    echo "✅ OK"
else
    echo "❌ FAILED"
    exit 1
fi

# Test API (may require auth)
echo -n "Testing API (http://localhost:3001)... "
if curl -s http://localhost:3001 > /dev/null; then
    echo "✅ OK"
else
    echo "⚠️  May require authentication"
fi

echo ""
echo "✅ Dokploy is accessible!"
echo ""
echo "Next: Create admin user at http://localhost:3000"
