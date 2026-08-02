# Backend

## Run the existing build

This repository includes the Maven Wrapper (`mvnw` / `mvnw.cmd`). A packaged
application is available after a build, so run it with:

```powershell
cd backend
java -jar .\target\ai-resume-builder-backend-0.1.0.jar
```

To rebuild after source changes, use the Maven Wrapper:

```powershell
.\mvnw.cmd spring-boot:run
```

The API server runs on http://localhost:8080.

Before starting, create `backend/.env` from `.env.example` and set your local
PostgreSQL credentials. The `.env` file is ignored by Git and loaded locally by
Spring Boot; never add real credentials to `application.properties`.

For a frontend opened from another device on the same Wi-Fi, add its Vite URL
to `APP_CORS_ALLOWED_ORIGINS` in `backend/.env`, for example
`APP_CORS_ALLOWED_ORIGINS=http://192.168.1.50:5173`.

## AI configuration

The app supports one active AI provider at a time. Set environment variables
before starting the backend; do not commit actual keys.

```powershell
$env:AI_PROVIDER = "gemini" # or "openai"
$env:GEMINI_API_KEY = "your-key"
java -jar .\target\ai-resume-builder-backend-0.1.0.jar
```

Gemini is the default provider and has a limited free developer tier. To use
OpenAI instead, set `AI_PROVIDER=openai` and `OPENAI_API_KEY`.

## Authentication configuration

Set `JWT_SECRET` in `backend/.env` to a private random value of at least 32
characters. The API now issues short-lived bearer JWTs. Send it with each
protected request:

```text
Authorization: Bearer <access-token>
```

Refresh tokens are stored only in an HttpOnly `SameSite=Strict` cookie and are
rotated at `/api/v1/auth/refresh`. Set `APP_SECURE_COOKIES=true` in HTTPS
production. Password-reset and email-verification links are one-time and
hashed in the database. Configure `SPRING_MAIL_HOST`, `SPRING_MAIL_USERNAME`,
and `SPRING_MAIL_PASSWORD` in `.env` to deliver those emails; the application
never logs recovery tokens.
