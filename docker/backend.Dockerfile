FROM eclipse-temurin:21-jdk
WORKDIR /app
COPY backend/ ./backend/
WORKDIR /app/backend
RUN ./mvnw spring-boot:help >/dev/null 2>&1 || true
EXPOSE 8080
CMD ["mvn", "spring-boot:run"]
