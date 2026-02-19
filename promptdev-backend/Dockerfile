# syntax=docker/dockerfile:1
FROM ghcr.io/graalvm/native-image-community:25 AS build
WORKDIR /app
COPY --chmod=755 mvnw .
COPY .mvn .mvn
COPY pom.xml .
COPY src src
RUN --mount=type=cache,target=/root/.m2 ./mvnw -Pnative native:compile -DskipTests

FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
        libstdc++6 libz1 curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r spring && useradd -r -g spring spring \
    && mkdir -p /data/workspaces && chown spring:spring /data/workspaces
USER spring
COPY --from=build /app/target/promptdev-backend ./promptdev-backend
EXPOSE 8080
ENTRYPOINT ["./promptdev-backend"]
