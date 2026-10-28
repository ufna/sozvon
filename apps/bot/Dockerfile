FROM node:24-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --chown=node:node src ./src
USER node
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 CMD node -e "require('node:fs').accessSync('/tmp/voice-bot-ready')"
CMD ["node", "src/index.js"]
