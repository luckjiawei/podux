# Multi-stage Dockerfile for frpc-hub
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy frontend source
COPY site/package*.json site/pnpm-lock.yaml* ./
# Install dependencies (try pnpm first, fallback to npm)
RUN if [ -f pnpm-lock.yaml ]; then \
        npm install -g pnpm && pnpm install; \
    else \
        npm install; \
    fi

COPY site/ ./
RUN if [ -f pnpm-lock.yaml ]; then \
        pnpm run build; \
    else \
        npm run build; \
    fi

# Stage 2: Build backend
FROM golang:1.25-alpine AS backend-builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/dist ./pb_public

# Build the application
ARG VERSION=dev
ARG BUILD_TIME
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags "-s -w -X main.Version=${VERSION} -X main.BuildTime=${BUILD_TIME}" \
    -o frpc-hub \
    main.go

# Stage 3: Final runtime image
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1000 frpchub && \
    adduser -D -u 1000 -G frpchub frpchub

WORKDIR /app

# Copy binary from builder
COPY --from=backend-builder /app/frpc-hub .

# Create data directory
RUN mkdir -p /app/pb_data && \
    chown -R frpchub:frpchub /app

# Switch to non-root user
USER frpchub

# Expose port
EXPOSE 8090

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8090/api/health || exit 1

# Run the application
ENTRYPOINT ["/app/frpc-hub"]
CMD ["serve", "--http", "0.0.0.0:8090"]
