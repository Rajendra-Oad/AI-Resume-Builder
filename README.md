# AI Resume Builder

> An enterprise-grade AI-powered resume builder that helps users create, optimize, analyze, and manage professional resumes using modern AI models and strong software engineering practices.

---

## Project Overview

AI Resume Builder is a full-stack web application designed to simplify resume creation while providing intelligent AI-assisted support.

### Core goals

- Create polished resumes quickly
- Generate tailored resume content with AI
- Improve ATS compatibility
- Support secure authentication and data privacy
- Provide a modular architecture for future growth

### Tech stack

- Frontend: React 19, Vite, Tailwind CSS, React Router, Axios
- Backend: Java 21, Spring Boot, Spring Security, Spring Data JPA, Hibernate, JWT
- Database: MySQL
- AI providers: OpenAI and Gemini with an abstraction layer
- DevOps: Docker, Docker Compose, Git
- Deployment: Vercel, Render or AWS

---

## Repository Structure

```text
AI-Resume-Builder/
├── backend/                 # Spring Boot API
├── frontend/                # React + Vite application
├── database/                # Schema and migration files
├── docker/                  # Dockerfiles and Compose files
├── docs/                    # Project architecture and planning docs
├── scripts/                 # Setup and automation scripts
├── .github/                 # CI/CD and templates
├── .vscode/                 # Shared editor settings
├── .gitignore
├── README.md
└── LICENSE
```

---

## Current Status

Phase 1 — Project Foundation and Repository Setup

### Completed

- Project folder structure created
- Frontend scaffold added
- Backend scaffold added
- Database and Docker folders initialized
- Documentation structure prepared

### Next steps

- Add VS Code workspace configuration
- Add CI/CD workflow files
- Implement authentication and database schema

---

## Getting Started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
mvn spring-boot:run
```

### Docker

```bash
docker compose -f docker/docker-compose.yml up --build
```

---

## Documentation

Architecture and planning documents are stored in the docs folder.

---

## License

This project is intended for educational and portfolio purposes unless otherwise specified.
