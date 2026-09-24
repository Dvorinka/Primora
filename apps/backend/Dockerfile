FROM golang:1.26-alpine AS builder
WORKDIR /app

RUN apk add --no-cache git

# Backend Go module lives in apps/backend
COPY apps/backend/go.mod apps/backend/go.sum ./
RUN go mod download

COPY apps/backend ./
RUN CGO_ENABLED=0 go build -o /primora-backend ./cmd/server

# glibc base — the DBX MCP binary does not run on musl.
FROM debian:bookworm-slim
WORKDIR /app

ARG TARGETARCH
ARG DBX_VERSION=0.4.88
# Pinned hashes from the packages-v0.4.88 release SHA256SUMS.
ARG DBX_SHA256_X64=dcfcc1c321b1e1db437bbc36bf4b07489e64c93aa9ce2e11ccdb1a3d88ee8662
ARG DBX_SHA256_ARM64=fab32b1096d676d068b171079896791d658aaf5cb4d86b5196cad973f3aded58

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl \
 && rm -rf /var/lib/apt/lists/* \
 && case "$TARGETARCH" in \
      amd64) DBX_ARCH=x64; DBX_SHA256=$DBX_SHA256_X64 ;; \
      arm64) DBX_ARCH=arm64; DBX_SHA256=$DBX_SHA256_ARM64 ;; \
      *) echo "unsupported TARGETARCH: $TARGETARCH" >&2; exit 1 ;; \
    esac \
 && curl -fsSL "https://github.com/t8y2/dbx/releases/download/packages-v${DBX_VERSION}/dbx-mcp-linux-${DBX_ARCH}-gnu.tar.gz" -o /tmp/dbx-mcp.tar.gz \
 && echo "${DBX_SHA256}  /tmp/dbx-mcp.tar.gz" | sha256sum -c - \
 && tar -xzf /tmp/dbx-mcp.tar.gz -C /usr/local/bin \
 && chmod +x /usr/local/bin/dbx-mcp \
 && rm /tmp/dbx-mcp.tar.gz

# Functions runtime — bun static binary from the official image (multi-arch).
COPY --from=oven/bun:1.3.14 /usr/local/bin/bun /usr/local/bin/bun

COPY --from=builder /primora-backend /usr/local/bin/primora-backend
COPY --from=builder /app/db ./db
COPY --from=builder /app/openapi ./openapi

EXPOSE 8080

CMD ["primora-backend"]
