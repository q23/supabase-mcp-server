# Real Dokploy Docker Environment
# Ubuntu 22.04 + Complete Dokploy Installation

FROM ubuntu:22.04

# Avoid interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install prerequisites
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    ca-certificates \
    gnupg \
    lsb-release \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Install Docker CLI (for Dokploy to manage containers via mounted socket)
RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y docker-ce-cli docker-compose-plugin && \
    rm -rf /var/lib/apt/lists/*

# Create dokploy user
RUN useradd -m -s /bin/bash dokploy && \
    usermod -aG sudo dokploy && \
    echo "dokploy ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Copy setup script
COPY setup.sh /tmp/setup.sh
RUN chmod +x /tmp/setup.sh

# Switch to dokploy user
USER dokploy
WORKDIR /home/dokploy

# Run Dokploy installation
RUN /tmp/setup.sh

# Expose ports
EXPOSE 3000 3001

# Volume for Dokploy data
VOLUME ["/home/dokploy"]

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Start Dokploy
CMD ["bash", "-c", "dokploy start || tail -f /dev/null"]
