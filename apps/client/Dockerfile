FROM node:24-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

ARG SERVER_URL=http://localhost:4001/
ARG SERVER_WS_URL=ws://localhost:4001/
ARG DEV_MODE=false
ARG ICE_SERVERS=
ARG VERSION=local
ENV SERVER_URL=$SERVER_URL
ENV SERVER_WS_URL=$SERVER_WS_URL
ENV DEV_MODE=$DEV_MODE
ENV ICE_SERVERS=$ICE_SERVERS
ENV VERSION=$VERSION

RUN npm run build

FROM nginx:alpine@sha256:1d13701a5f9f3fb01aaa88cef2344d65b6b5bf6b7d9fa4cf0dca557a8d7702ba

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
