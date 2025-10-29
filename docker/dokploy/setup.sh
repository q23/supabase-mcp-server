#!/bin/bash
# Automated Dokploy Installation Script

set -e

echo "================================================"
echo "Installing Dokploy..."
echo "================================================"

# Install Dokploy using official script
curl -sSL https://dokploy.com/install.sh | sh

echo "================================================"
echo "Dokploy installation complete!"
echo "================================================"

# Mark installation complete
touch /tmp/dokploy-installed

echo "Dokploy will start when container runs"
echo "Access UI at: http://localhost:3000"
