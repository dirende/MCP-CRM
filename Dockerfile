# ── Frontend Static Server (Node.js HTTP) ────────────────────────
# Serves demo.html + JS bundles on port 8080
# No npm dependencies — uses only Node.js built-in modules

FROM node:20-alpine

WORKDIR /app

# Copy the static file server
COPY server.js ./

# Copy static assets served to the browser
COPY demo.html    ./
COPY lib/         ./lib/
COPY js/          ./js/
COPY resourses/   ./resourses/
COPY simulator/   ./simulator/

EXPOSE 8080

CMD ["node", "server.js"]
