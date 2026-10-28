FROM golang:1.27.3-bookworm@sha256:972b4110ba0f47539a975c31e52c64765e1ff19f2d74469ae4a595c6676e80a5 AS sfu-build
WORKDIR /src
ARG LIVEKIT_REVISION=e5655ac
ADD https://api.github.com/repos/livekit/livekit/tarball/v1.13.10 /tmp/livekit.tar.gz
RUN echo "2ba8e0fb0565f0b1d3b164279283832a8578784c71593fb16a8a210914e4fe9e  /tmp/livekit.tar.gz" | sha256sum -c - && tar -xzf /tmp/livekit.tar.gz --strip-components=1
COPY apps/server/sfu/go.mod apps/server/sfu/go.sum ./
RUN go mod download && go run golang.org/x/vuln/cmd/govulncheck@v1.9.0 ./cmd/server
RUN CGO_ENABLED=0 go build -mod=readonly -trimpath -ldflags="-s -w" -o /livekit-server ./cmd/server
RUN mkdir /licenses && find /go/pkg/mod -type f \( -iname 'LICENSE*' -o -iname 'NOTICE*' -o -iname 'COPYING*' \) -exec cp --parents '{}' /licenses/ \;
FROM caddy:2.11.7-alpine@sha256:eb4d35b7452d1ab6171fbdbe8d9275b2301dad6dad92115d91e19fb9b24d510f AS caddy
# Caddy listens on unprivileged internal ports. Strip upstream file capabilities
# so it also runs with no-new-privileges and all container capabilities dropped.
RUN setcap -r /usr/bin/caddy
FROM golang:1.27.3-bookworm@sha256:972b4110ba0f47539a975c31e52c64765e1ff19f2d74469ae4a595c6676e80a5 AS caddy-notices
COPY --from=caddy /usr/bin/caddy /caddy
RUN go version -m /caddy | awk '($1 == "dep" || $1 == "=>") && $3 ~ /^v/ {print $2 "@" $3}' | xargs -r go mod download
RUN mkdir /licenses && find /go/pkg/mod -type f \( -iname 'LICENSE*' -o -iname 'NOTICE*' -o -iname 'COPYING*' \) -exec cp --parents '{}' /licenses/ \;
FROM node:24-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS client-build
WORKDIR /client
COPY apps/client/package.json apps/client/package-lock.json ./
RUN npm ci --ignore-scripts
COPY apps/client/ ./
COPY docker/collect-licenses.mjs /tmp/collect-licenses.mjs
RUN node /tmp/collect-licenses.mjs /client/node_modules /client/licenses
ARG VERSION=selfhost
ENV SERVER_URL=/api/ SERVER_WS_URL=/api/ DEV_MODE=false VERSION=$VERSION
RUN npm run build
FROM node:24-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205
WORKDIR /app
ENV NODE_ENV=production
LABEL org.opencontainers.image.title="sozvon" \
      org.opencontainers.image.description="Minimal self-hosted calls: web, API, SFU and HTTPS in one image" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/ufna/sozvon"
COPY apps/server/package.json apps/server/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --chown=node:node apps/server/src ./src
COPY --chown=node:node apps/server/bin ./bin
COPY --chown=node:node docker/*.mjs ./docker/
COPY --from=client-build --chown=node:node /client/dist ./public
COPY --from=client-build /client/licenses /usr/share/doc/sozvon/licenses/client-dependencies
COPY --from=sfu-build /src/LICENSE /usr/share/doc/sozvon/licenses/livekit-LICENSE.txt
COPY --from=sfu-build /usr/local/go/LICENSE /usr/share/doc/sozvon/licenses/go-LICENSE.txt
COPY --from=sfu-build /licenses /usr/share/doc/sozvon/licenses/livekit-dependencies
COPY --from=caddy-notices /licenses /usr/share/doc/sozvon/licenses/caddy-dependencies
COPY --from=sfu-build /livekit-server /usr/local/bin/livekit-server
COPY --from=caddy /usr/bin/caddy /usr/bin/caddy
COPY --from=caddy /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY LICENSE THIRD-PARTY-NOTICES.md compose.selfhost.yaml /usr/share/doc/sozvon/
COPY docs/docker.md /usr/share/doc/sozvon/README.md
COPY docs/licenses/ /usr/share/doc/sozvon/licenses/
RUN test -s /etc/ssl/certs/ca-certificates.crt && mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 8080 8443 7881 7882/udp
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:4001/readyz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
STOPSIGNAL SIGTERM
ENTRYPOINT ["node", "/app/docker/entrypoint.mjs"]
