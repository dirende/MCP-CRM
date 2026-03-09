# ── Backend API (Node.js Express) ────────────────────────────────
# Serves REST API on port 3000
# Integrates: Genesys Cloud, ServiceNow, Anthropic Claude AI

FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests first for better Docker layer caching.
# This layer is only rebuilt when package.json changes.
COPY package*.json ./

# Install production dependencies only (skip devDependencies like nodemon)
RUN npm ci --only=production

# Copy application source
COPY server.js   ./
COPY agents/     ./agents/
COPY routes/     ./routes/

# .env is NOT copied into the image — it is mounted at runtime via docker-compose
# This keeps credentials out of the Docker image layers.

EXPOSE 3000

CMD ["node", "server.js"]
