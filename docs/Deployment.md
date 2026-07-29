# Production deployment on the existing AWS EC2 host

This runbook deploys the Spring Boot backend and an HTTPS Nginx reverse proxy
with Docker Compose. The React frontend remains on Vercel and MySQL 8 remains a
host service on EC2. Compose does not create, replace, or modify MySQL.

## Confirmed AWS target

This runbook is currently tailored to the following provisioned instance:

| Setting | Confirmed value |
| --- | --- |
| Name | `ai-resume-builder-server` |
| Instance ID | `i-095f7e9eeb4d575f4` |
| Region / Availability Zone | `ap-south-2` / `ap-south-2a` |
| Instance type | `t3.micro` (2 vCPU, approximately 1 GiB RAM) |
| Operating system | Ubuntu Server 24.04 LTS |
| Public IPv4 | `98.130.46.72` (auto-assigned, not an Elastic IP) |
| Public DNS | `ec2-98-130-46-72.ap-south-2.compute.amazonaws.com` |
| Private IPv4 | `172.31.4.33` |
| Security group | `launch-wizard-1` |
| Root volume | `vol-05ad1ef8fb3d35e1a`, 8 GiB, unencrypted |
| Key pair | `ai-resume-builder-key` |
| IMDS | IMDSv2 required |

The current public IPv4 address is not stable across an EC2 stop/start. Pointing
production DNS and issuing TLS certificates should wait until a stable address
strategy has been selected. Do not use the EC2 public DNS name as the
application's permanent API URL.

## Current topology

```text
Vercel frontend
    |
    | HTTPS /api requests
    v
EC2 :443 -> unprivileged Nginx container
                    |
                    v
             Spring Boot :8080
                    |
                    v
       host MySQL localhost:3306
```

The backend uses host networking deliberately. This makes the existing
`jdbc:mysql://localhost:3306/ai_resume_builder` URL refer to EC2's host MySQL
rather than to the container itself. Nginx reaches port 8080 through
`host.docker.internal`, which Compose maps to Docker's host gateway.

## Preconditions

- SSH access already works with the existing key; do not alter it:

  ```bash
  ssh -i ai-resume-builder-key.pem ubuntu@98.130.46.72
  ```

- Java 21, Maven, Git, Docker, Docker Compose, Nginx, and MySQL are already
  installed. Do not reinstall them.
- Database `ai_resume_builder` and user `resume_user` already exist.
- `backend/.env` exists and is readable only by the deployment user.
- A DNS hostname for the backend points to the EC2 public IP.
- A valid TLS certificate and key for that hostname exist on EC2.

The containerized Nginx needs host ports 80 and 443. The host Nginx service must
be stopped during the cutover because two processes cannot bind the same ports.
Do not stop it until the certificate exists and the Compose configuration has
passed validation.

## 1. Verify capacity and network exposure

The 8 GiB root disk and 1 GiB RAM are the main deployment constraints. Check
them before building:

```bash
df -h /
free -h
docker system df
sudo systemctl is-active mysql
sudo systemctl is-active nginx
```

Keep at least 2 GiB free before starting the Docker build. Do not run
`docker system prune` automatically: inspect its output first because it can
remove reusable images and build cache.

In the AWS console, verify that `launch-wizard-1` has only the required inbound
rules:

| Port | Source | Purpose |
| --- | --- | --- |
| 22 | Developer's current public IP `/32` | Existing SSH access |
| 80 | `0.0.0.0/0` | HTTP redirect and certificate renewal |
| 443 | `0.0.0.0/0` | Public HTTPS API |

Do not add public inbound rules for MySQL `3306` or Spring Boot `8080`.
The instance uses unlimited T3 CPU credits, so monitor `CPUCreditBalance` and
`CPUSurplusCreditsCharged` during image builds and sustained traffic.

## 2. Update and verify the checkout

From the repository root on EC2:

```bash
git pull --ff-only
git status --short
docker compose version
```

Do not proceed with an unexpected dirty working tree.

## 3. Protect and verify environment configuration

The application consumes secrets only from `backend/.env`; Docker does not copy
that file into the image:

```bash
chmod 600 backend/.env
grep -E '^(DB_URL|DB_USERNAME|APP_FRONTEND_URL|APP_CORS_ALLOWED_ORIGINS|APP_SECURE_COOKIES)=' backend/.env
```

The expected non-secret values are:

```dotenv
DB_URL=jdbc:mysql://localhost:3306/ai_resume_builder
DB_USERNAME=resume_user
APP_FRONTEND_URL=https://ai-resume-builder-india.vercel.app
APP_CORS_ALLOWED_ORIGINS=https://ai-resume-builder-india.vercel.app
APP_SECURE_COOKIES=true
```

Do not print `DB_PASSWORD`, `JWT_SECRET`, provider keys, SMTP credentials, or
OTP credentials to the terminal. The `prod` profile also requires valid MSG91
configuration in the current application.

Test the same database credentials before building:

```bash
mysql -u resume_user -p -h 127.0.0.1 ai_resume_builder \
  -e "SELECT DATABASE(), CURRENT_USER();"
```

An empty application schema is expected before the first successful backend
startup. Do not create tables manually; Flyway owns schema creation.

## 4. Configure Compose-only TLS paths

Stage the existing certificate for the unprivileged Nginx UID/GID. This example
does not alter or delete the source certificate:

```bash
sudo install -d -o root -g 101 -m 750 /opt/ai-resume-builder/tls
sudo install -o root -g 101 -m 640 \
  /etc/letsencrypt/live/YOUR_BACKEND_DOMAIN/fullchain.pem \
  /opt/ai-resume-builder/tls/fullchain.pem
sudo install -o root -g 101 -m 640 \
  /etc/letsencrypt/live/YOUR_BACKEND_DOMAIN/privkey.pem \
  /opt/ai-resume-builder/tls/privkey.pem
```

Repeat the two `install` commands after certificate renewal, then run
`docker compose -f docker/docker-compose.yml restart nginx`.

Copy the non-secret template:

```bash
cp docker/.env.example docker/.env
chmod 600 docker/.env
```

Edit only the two certificate paths in `docker/.env`. For example:

```dotenv
NGINX_TLS_CERTIFICATE=/opt/ai-resume-builder/tls/fullchain.pem
NGINX_TLS_PRIVATE_KEY=/opt/ai-resume-builder/tls/privkey.pem
```

The Docker daemon must be able to read both files. Never copy a private key into
the repository or Docker build context.

## 5. Validate before cutover

```bash
docker compose -f docker/docker-compose.yml config --quiet
docker compose -f docker/docker-compose.yml build backend
```

The build uses Maven in a multi-stage Docker build; it does not require the host
Maven installation. A `t3.micro` has limited memory, so build when other
memory-heavy processes are idle. If the build cannot fit, build the same image
on CI or another machine and pull it on EC2—do not weaken runtime isolation.

## 6. Start the backend and run Flyway

Start only the backend first:

```bash
docker compose -f docker/docker-compose.yml up -d backend
docker compose -f docker/docker-compose.yml logs -f backend
```

On first startup, Flyway applies the versioned migrations to
`ai_resume_builder`. Wait for the application-started log and then check:

```bash
curl --fail http://127.0.0.1:8080/actuator/health
docker compose -f docker/docker-compose.yml ps
mysql -u resume_user -p -h 127.0.0.1 ai_resume_builder \
  -e "SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank;"
```

If migration fails, inspect the first error and fix configuration or grants. Do
not delete tables, edit an applied migration, or run Flyway repair casually.

## 7. Cut over HTTPS

After the backend is healthy and TLS paths are valid:

```bash
sudo nginx -t
sudo systemctl stop nginx
docker compose -f docker/docker-compose.yml up -d nginx
docker compose -f docker/docker-compose.yml ps
```

If the Nginx container fails, restore the previous proxy immediately:

```bash
docker compose -f docker/docker-compose.yml stop nginx
sudo systemctl start nginx
```

Validate through the public backend hostname:

```bash
curl --fail https://YOUR_BACKEND_DOMAIN/actuator/health
curl --head https://YOUR_BACKEND_DOMAIN/
```

The root URL redirects to the existing Vercel frontend. API requests under
`/api/` proxy to Spring Boot. Configure the Vercel production environment to
use `https://YOUR_BACKEND_DOMAIN` as its API origin, then redeploy the Vercel
frontend if that value changed.

## 8. Operations and rollback

View status and bounded Docker logs:

```bash
docker compose -f docker/docker-compose.yml ps
docker compose -f docker/docker-compose.yml logs --tail=200 backend
docker compose -f docker/docker-compose.yml logs --tail=200 nginx
```

Deploy a new revision:

```bash
git pull --ff-only
docker compose -f docker/docker-compose.yml build backend
docker compose -f docker/docker-compose.yml up -d --no-deps backend
docker compose -f docker/docker-compose.yml ps
```

Stop the containers without touching MySQL:

```bash
docker compose -f docker/docker-compose.yml down
```

Compose uses `json-file` logging with three 10 MiB files per service. Both
containers drop Linux capabilities, prevent privilege escalation, and use
read-only root filesystems with bounded temporary filesystems. The backend runs
as UID/GID 10001 and the proxy uses the upstream unprivileged Nginx image.

## Security-group exposure

- Keep SSH port 22 restricted to the developer's IP.
- Allow public inbound 80 and 443 for HTTPS and certificate renewal.
- Do not expose 3306 publicly.
- Do not expose 8080 publicly. Host networking makes Spring listen on the EC2
  interface, so enforce this with the EC2 security group and host firewall.
- Keep production CORS restricted to
  `https://ai-resume-builder-india.vercel.app`.
