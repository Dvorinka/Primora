FROM golang:1.24-alpine AS builder
WORKDIR /app

RUN apk add --no-cache git build-base

# Copy root configs for workspace context
COPY go.mod go.sum ./
COPY apps/backend ./apps/backend

RUN go mod download

WORKDIR /app/apps/backend
RUN go build -o /primora-backend ./cmd/server

FROM alpine:3.21
WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY --from=builder /primora-backend /usr/local/bin/primora-backend
COPY --from=builder /app/apps/backend/db ./db
COPY --from=builder /app/apps/backend/openapi ./openapi

EXPOSE 8080

CMD ["primora-backend"]
