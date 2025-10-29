#!/bin/bash
# Start Dokploy Docker Container

set -e

CONTAINER_NAME="dokploy-dev"
IMAGE_NAME="dokploy-dev"

# Check if container already exists
if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
    echo "Container $CONTAINER_NAME already exists. Starting it..."
    docker start $CONTAINER_NAME
else
    echo "Starting new Dokploy container..."
    docker run -d \
        --name $CONTAINER_NAME \
        -p 3000:3000 \
        -p 3001:3001 \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -v dokploy-data:/home/dokploy \
        --restart unless-stopped \
        $IMAGE_NAME
fi

echo ""
echo "✅ Dokploy container started!"
echo ""
echo "Waiting for Dokploy to be ready (this takes ~60 seconds)..."
sleep 60

echo ""
echo "🎉 Dokploy should be ready!"
echo ""
echo "Access Dokploy UI: http://localhost:3000"
echo ""
echo "Next steps:"
echo "1. Create admin account in UI"
echo "2. Generate API key (Settings → API Keys)"
echo "3. Update .env with:"
echo "   DOKPLOY_API_URL=http://localhost:3001"
echo "   DOKPLOY_API_KEY=<your-key>"
echo ""
echo "Then test with: bun run dev"
echo ""
