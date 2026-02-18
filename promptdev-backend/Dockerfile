# syntax=docker/dockerfile:1
# =============================================================================
# PromptDev Backend — GraalVM Native Image (best startup + memory)
# =============================================================================
# Compiles to a standalone native executable — no JVM at runtime.
# Build requires ~8 GB RAM; set Docker Desktop memory accordingly.
# 
# BuildKit caching:
#   Requires Docker 18.09+ with BuildKit enabled.
#   Build with: DOCKER_BUILDKIT=1 docker build [...]
#   Or with docker-compose: COMPOSE_DOCKER_CLI_BUILD=1 docker-compose build
# =============================================================================

# ── Stage 1: Download dependencies (persistent cache) ──────────────────────
FROM ghcr.io/graalvm/native-image-community:21 AS deps
WORKDIR /app
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 chmod +x mvnw && ./mvnw dependency:go-offline -Pnative

# ── Stage 2: Compile native image (with Maven cache) ────────────────────────
FROM deps AS build
COPY src src
RUN --mount=type=cache,target=/root/.m2 ./mvnw -Pnative native:compile -DskipTests

# ── Stage 3: Minimal runtime ────────────────────────────────────────────────
FROM debian:bookworm-slim
WORKDIR /app

# Required shared libs for the native executable + health check + non-root user
RUN apt-get update && apt-get install -y --no-install-recommends \
        libstdc++6 libz1 curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r spring && useradd -r -g spring spring \
    && mkdir -p /data/workspaces && chown spring:spring /data/workspaces
USER spring

COPY --from=build /app/target/promptdev-backend ./promptdev-backend

EXPOSE 8080
ENTRYPOINT ["./promptdev-backend"]
