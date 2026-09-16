FROM golang:1.26-alpine AS builder
WORKDIR /app

RUN apk add --no-cache git

# Backend Go module lives in apps/backend
COPY apps/backend/go.mod apps/backend/go.sum ./
RUN go mod download

COPY apps/backend ./
RUN CGO_ENABLED=0 go build -o /primora-backend ./cmd/server

FROM alpine:3.21
WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY --from=builder /primora-backend /usr/local/bin/primora-backend
COPY --from=builder /app/db ./db
COPY --from=builder /app/openapi ./openapi

EXPOSE 8080

CMD ["primora-backend"]
