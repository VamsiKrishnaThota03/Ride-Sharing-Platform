# syntax=docker/dockerfile:1

FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# --omit=dev also skips the optional sqlite3 build, which is only a local
# convenience; production uses PostgreSQL through `pg`.
RUN npm install --omit=dev --omit=optional --no-audit --no-fund

FROM node:26-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
# The published port is the security boundary (see docker-compose.yml); inside
# the container the listener must accept the Docker network.
ENV HOST=0.0.0.0
ENV PORT=5001

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node server.js app.js realtime.js ./
COPY --chown=node:node config ./config
COPY --chown=node:node routes ./routes
COPY --chown=node:node models ./models
COPY --chown=node:node controllers ./controllers
COPY --chown=node:node middleware ./middleware
COPY --chown=node:node utils ./utils

USER node
EXPOSE 5001

# Liveness, not readiness: the process should stay up through a database blip.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5001)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
