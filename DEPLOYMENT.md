# Production Deployment Guide

## Architecture

```
[Traefik] → [Nginx] → [Gunicorn] → [Django]
    ↓          ↓
 [Frontend]  [Static/Media Files]
```

## Prerequisites

- Docker & Docker Compose
- Domain name with DNS configured
- SSL certificates (Let's Encrypt recommended)
- Server with 2GB+ RAM

## Environment Variables

Copy `.env.production.example` to `.env.production` and configure:

- `SECRET_KEY`: Generate with `python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'`
- `DB_PASSWORD`: Strong random password
- `ALLOWED_HOSTS`: Your domain(s)
- `CORS_ALLOWED_ORIGINS`: Your frontend URL

## Docker Compose Production

See private deployment repository for full production docker-compose.yml with Traefik configuration.

## Building Production Images

### Backend
```bash
cd backend
docker build -f Dockerfile.prod -t prospectflow-backend:latest .
```

### Frontend
```bash
cd frontend
docker build -f Dockerfile.prod -t prospectflow-frontend:latest .
```

## Security Checklist

- [ ] DEBUG=False
- [ ] Strong SECRET_KEY (50+ random characters)
- [ ] Strong database password (20+ characters)
- [ ] ALLOWED_HOSTS configured with actual domains
- [ ] CORS configured with actual frontend URL
- [ ] HTTPS/SSL enabled via Traefik/Let's Encrypt
- [ ] Regular backups configured
- [ ] Firewall configured (ports 80, 443 only)
- [ ] Database not exposed to internet
- [ ] Media files permissions restricted

## Health Checks

- Health check: `/api/health/` (to be implemented)
- Django admin: `/admin/`
- API docs: `/api/docs/`

## Static Files

Static files are collected during container startup via `entrypoint.sh`:
```bash
python manage.py collectstatic --noinput
```

Nginx serves static files from shared volume `/app/staticfiles/`.

## Database Migrations

Migrations run automatically during container startup via `entrypoint.sh`:
```bash
python manage.py migrate --noinput
```

## Logging

Logs are output to stdout/stderr and can be viewed with:
```bash
docker-compose logs -f django
docker-compose logs -f nginx
docker-compose logs -f celery
```

For production, configure log aggregation (ELK, Loki, etc.).

## Backups

Regular PostgreSQL backups recommended:
```bash
docker-compose exec postgres pg_dump -U prospectflow prospectflow > backup_$(date +%Y%m%d).sql
```

## Scaling

Horizontal scaling can be achieved by:
1. Adding more Gunicorn workers (config in `gunicorn_config.py`)
2. Running multiple Django containers behind Traefik load balancer
3. Database read replicas for read-heavy workloads

## Troubleshooting

### Static files not loading
- Verify `collectstatic` ran successfully in logs
- Check Nginx volume mount for `/app/staticfiles/`
- Verify STATIC_ROOT setting in Django

### Database connection errors
- Ensure postgres container is healthy
- Verify DB_HOST, DB_PORT environment variables
- Check postgres container logs

### 502 Bad Gateway
- Django container not running or crashed
- Check `docker-compose ps` and `docker-compose logs django`
- Verify Gunicorn binding to 0.0.0.0:8000

## Production Deployment Repository

For full production deployment with:
- Ansible automation
- Traefik SSL/TLS
- GitHub Actions CD
- Backup scripts

See private repository: `prospecting-deploy` (access required)

---

**Note**: This is a generic deployment guide. Production-specific configurations (domains, IPs, secrets) are maintained in a private repository.
