# Dokploy-like Deployment System
# Node.js + Express + Docker Compose for real deployments

FROM node:20-alpine

# Install Docker CLI and Docker Compose
RUN apk add --no-cache \
    docker-cli \
    docker-cli-compose \
    curl \
    bash

WORKDIR /app

# Copy deployment manager
COPY deployment-manager/ ./

# Install dependencies
RUN npm install

# Expose ports
EXPOSE 3000 3001

# Volume for deployment data
VOLUME ["/app/deployments"]

# Healthcheck
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start deployment manager
CMD ["npm", "start"]
