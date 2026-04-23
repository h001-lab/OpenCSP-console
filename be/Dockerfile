# Build stage
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle/ gradle/
RUN ./gradlew dependencies --no-daemon -q || true
COPY src/ src/
RUN ./gradlew bootJar -x test --no-daemon

# tsh download stage
# TELEPORT_VERSION은 서버 버전과 맞춰야 한다 (major 버전 ±1 이내 권장)
FROM alpine:3.20 AS tsh-installer
ARG TELEPORT_VERSION=17.4.3
RUN apk add --no-cache curl && \
    ARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/') && \
    curl -fsSL "https://cdn.teleport.dev/teleport-v${TELEPORT_VERSION}-linux-${ARCH}-bin.tar.gz" \
         -o /tmp/teleport.tar.gz && \
    tar -xzf /tmp/teleport.tar.gz teleport/tsh && \
    mv teleport/tsh /usr/local/bin/tsh && \
    chmod +x /usr/local/bin/tsh

# Run stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# gcompat: Alpine(musl) 위에서 glibc 빌드된 tsh 바이너리를 실행하기 위한 호환 레이어
RUN apk add --no-cache gcompat && \
    addgroup -S spring && \
    adduser -S spring -G spring -h /home/spring && \
    mkdir -p /home/spring /app/data && \
    chown -R spring:spring /home/spring /app

COPY --from=tsh-installer /usr/local/bin/tsh /usr/local/bin/tsh
USER spring
COPY --from=builder /app/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
