# syntax=docker/dockerfile:1.7

# Build the executable Spring Boot JAR in an isolated Java 21 stage.
FROM maven:3.9.11-eclipse-temurin-21 AS builder
WORKDIR /workspace

# Copy dependency metadata first so Docker can reuse downloaded dependencies.
COPY pom.xml mvnw mvnw.cmd ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw -B -ntp dependency:go-offline

# Application sources are copied only after the dependency layer.
COPY src src
RUN ./mvnw -B -ntp -DskipTests package \
    && cp target/ai-resume-builder-backend-*.jar /workspace/app.jar

# Jammy JRE is smaller than a full JDK while retaining glibc compatibility for
# Java/PDF dependencies. curl is installed solely for the container healthcheck.
FROM eclipse-temurin:21-jre-jammy AS runtime

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 10001 app \
    && useradd --system --uid 10001 --gid app --home-dir /app --shell /usr/sbin/nologin app

WORKDIR /app
COPY --from=builder --chown=10001:10001 /workspace/app.jar /app/app.jar

# The application and image contain no environment files or deployment secrets.
USER 10001:10001
EXPOSE 8080

# Compose also defines this check so image-level and orchestrator-level health
# behavior remain consistent when the image is run independently.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
  CMD curl --fail --silent --show-error http://127.0.0.1:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]

