FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace/backend

COPY backend/pom.xml ./
RUN mvn -B dependency:go-offline
COPY backend/src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/backend/target/ai-resume-builder-backend-0.1.0.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
