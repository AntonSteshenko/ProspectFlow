# Manuale: Integrare ProspectFlow in Setup Production Esistente

## Scenario

Hai già:
- ✅ Server production con Traefik reverse proxy
- ✅ PostgreSQL condiviso tra più applicazioni
- ✅ Altre applicazioni dietro Traefik
- ✅ Let's Encrypt automatico configurato
- ✅ Deploy via Ansible
- ✅ Immagini Docker su DockerHub (da GitHub Actions)

Vuoi aggiungere: **ProspectFlow** come nuova applicazione

---

## Architettura Target

```
Internet
    ↓
[Traefik] → SSL/TLS (Let's Encrypt)
    ├── [App1] → app1.tuodominio.com
    ├── [App2] → app2.tuodominio.com
    └── [ProspectFlow] → prospectflow.tuodominio.com
         ├── Backend API (Django + Gunicorn)
         ├── Frontend (React + Nginx)
         ├── Celery Worker
         └── Redis

[PostgreSQL] (condiviso)
    ├── database_app1
    ├── database_app2
    └── prospectflow_db (NUOVO)
```

---

## Manuale Step-by-Step

### FASE 1: Preparazione Database PostgreSQL

#### 1.1 Creare Database e User

Connettiti al server PostgreSQL esistente:

```bash
# Opzione A: Se PostgreSQL è in container
docker exec -it postgres_container_name psql -U postgres

# Opzione B: Se PostgreSQL è servizio nativo
sudo -u postgres psql
```

Esegui SQL:

```sql
-- Crea user dedicato per ProspectFlow
CREATE USER prospectflow WITH PASSWORD 'STRONG_PASSWORD_HERE';

-- Crea database
CREATE DATABASE prospectflow_db OWNER prospectflow;

-- Grant privilegi
GRANT ALL PRIVILEGES ON DATABASE prospectflow_db TO prospectflow;

-- Verifica creazione
\l  -- Lista databases
\du -- Lista users

-- Esci
\q
```

#### 1.2 Verifica Connessione (dal server app)

```bash
# Test connessione da container o server app
psql -h postgres_host -U prospectflow -d prospectflow_db
# Password: [inserisci password]

# Se connessione OK, esci
\q
```

**Note importanti**:
- Salva password in vault Ansible o .env sicuro
- Se PostgreSQL è in container, assicurati network condiviso
- Se PostgreSQL è su altro server, verifica firewall rules

---

### FASE 2: Configurazione DNS

#### 2.1 Record DNS

Aggiungi record DNS per i sottodomini ProspectFlow:

**Provider DNS** (Cloudflare, Route53, etc):

```
Type: A
Name: prospectflow
Value: [IP_SERVER_PRODUCTION]
TTL: 3600 (o auto)

# Opzionale: Sottodominio separato per API
Type: A
Name: api.prospectflow
Value: [IP_SERVER_PRODUCTION]
TTL: 3600
```

#### 2.2 Verifica Propagazione

```bash
# Da locale
dig prospectflow.tuodominio.com
nslookup prospectflow.tuodominio.com

# Oppure
ping prospectflow.tuodominio.com
```

Aspetta propagazione DNS (5-30 min, dipende da TTL).

---

### FASE 3: Preparare File Configurazione

#### 3.1 Struttura Directory sul Server

Sul server production, crea:

```bash
sudo mkdir -p /opt/prospectflow
cd /opt/prospectflow

# Crea directory per configurazioni
mkdir -p config volumes/{postgres_data,media,staticfiles,redis_data}
```

#### 3.2 File docker-compose.yml

Crea `/opt/prospectflow/docker-compose.yml`:

```yaml
version: '3.8'

services:
  # Redis per Celery
  redis:
    image: redis:7-alpine
    container_name: prospectflow_redis
    restart: unless-stopped
    networks:
      - prospectflow_internal
    volumes:
      - ./volumes/redis_data:/data

  # Backend Django + Gunicorn
  backend:
    image: ${DOCKERHUB_USERNAME}/prospectflow-backend:latest
    container_name: prospectflow_backend
    restart: unless-stopped
    env_file: .env
    depends_on:
      - redis
    networks:
      - prospectflow_internal
      - traefik_network
    volumes:
      - ./volumes/staticfiles:/app/staticfiles
      - ./volumes/media:/app/media
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=traefik_network"

      # Router HTTP (redirect to HTTPS)
      - "traefik.http.routers.prospectflow-api-http.rule=Host(`prospectflow.tuodominio.com`) && PathPrefix(`/api`, `/admin`, `/static`, `/media`)"
      - "traefik.http.routers.prospectflow-api-http.entrypoints=web"
      - "traefik.http.routers.prospectflow-api-http.middlewares=redirect-to-https@docker"

      # Router HTTPS
      - "traefik.http.routers.prospectflow-api.rule=Host(`prospectflow.tuodominio.com`) && PathPrefix(`/api`, `/admin`, `/static`, `/media`)"
      - "traefik.http.routers.prospectflow-api.entrypoints=websecure"
      - "traefik.http.routers.prospectflow-api.tls=true"
      - "traefik.http.routers.prospectflow-api.tls.certresolver=letsencrypt"

      # Service
      - "traefik.http.services.prospectflow-api.loadbalancer.server.port=8000"

  # Celery Worker
  celery:
    image: ${DOCKERHUB_USERNAME}/prospectflow-backend:latest
    container_name: prospectflow_celery
    restart: unless-stopped
    command: celery -A config worker -l info
    env_file: .env
    depends_on:
      - redis
      - backend
    networks:
      - prospectflow_internal
    volumes:
      - ./volumes/media:/app/media

  # Frontend React + Nginx
  frontend:
    image: ${DOCKERHUB_USERNAME}/prospectflow-frontend:latest
    container_name: prospectflow_frontend
    restart: unless-stopped
    networks:
      - traefik_network
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=traefik_network"

      # Router HTTP (redirect to HTTPS)
      - "traefik.http.routers.prospectflow-frontend-http.rule=Host(`prospectflow.tuodominio.com`)"
      - "traefik.http.routers.prospectflow-frontend-http.entrypoints=web"
      - "traefik.http.routers.prospectflow-frontend-http.middlewares=redirect-to-https@docker"

      # Router HTTPS
      - "traefik.http.routers.prospectflow-frontend.rule=Host(`prospectflow.tuodominio.com`)"
      - "traefik.http.routers.prospectflow-frontend.entrypoints=websecure"
      - "traefik.http.routers.prospectflow-frontend.tls=true"
      - "traefik.http.routers.prospectflow-frontend.tls.certresolver=letsencrypt"

      # Service
      - "traefik.http.services.prospectflow-frontend.loadbalancer.server.port=80"

networks:
  prospectflow_internal:
    driver: bridge
  traefik_network:
    external: true  # Rete Traefik già esistente

volumes:
  redis_data:
  staticfiles:
  media:
```

**⚠️ IMPORTANTE**:
- Sostituisci `tuodominio.com` con il tuo dominio reale
- Sostituisci `traefik_network` con il nome della rete Traefik esistente (vedi `docker network ls`)
- Sostituisci `letsencrypt` con il nome del tuo certresolver Traefik

#### 3.3 File .env

Crea `/opt/prospectflow/.env`:

```bash
# DockerHub (per pull immagini)
DOCKERHUB_USERNAME=tuo_username_dockerhub

# Django
DEBUG=False
SECRET_KEY=GENERA_CHIAVE_LUNGA_RANDOM_50_CARATTERI
ALLOWED_HOSTS=prospectflow.tuodominio.com

# Database PostgreSQL (condiviso)
DB_NAME=prospectflow_db
DB_USER=prospectflow
DB_PASSWORD=STRONG_PASSWORD_HERE  # Stesso della FASE 1
DB_HOST=postgres_host_or_container_name
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/0

# CORS
CORS_ALLOWED_ORIGINS=https://prospectflow.tuodominio.com

# Email (opzionale)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Sentry (opzionale)
SENTRY_DSN=

# File uploads
MAX_UPLOAD_SIZE=10485760
```

**Come generare SECRET_KEY**:

```bash
# Metodo 1: Python
python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# Metodo 2: OpenSSL
openssl rand -base64 50
```

#### 3.4 Verifica Network Traefik

```bash
# Lista networks Docker
docker network ls

# Trova network Traefik (es. traefik_proxy, traefik_network, web, etc)
# Se non esiste, creala:
docker network create traefik_network
```

**Aggiorna `docker-compose.yml`** se nome network è diverso.

---

### FASE 4: Integrazione Ansible

#### 4.1 Aggiungere Task Ansible

Nel tuo playbook Ansible esistente, aggiungi task per ProspectFlow:

**File**: `playbooks/deploy_prospectflow.yml` (NUOVO)

```yaml
---
- name: Deploy ProspectFlow
  hosts: production
  become: yes

  vars:
    app_dir: /opt/prospectflow
    dockerhub_username: "{{ vault_dockerhub_username }}"  # Da Ansible vault

  tasks:
    - name: Create application directory
      file:
        path: "{{ app_dir }}"
        state: directory
        owner: "{{ ansible_user }}"
        group: "{{ ansible_user }}"
        mode: '0755'

    - name: Create subdirectories
      file:
        path: "{{ app_dir }}/{{ item }}"
        state: directory
        owner: "{{ ansible_user }}"
        group: "{{ ansible_user }}"
      loop:
        - config
        - volumes
        - volumes/media
        - volumes/staticfiles
        - volumes/redis_data

    - name: Copy docker-compose.yml
      template:
        src: ../templates/prospectflow/docker-compose.yml.j2
        dest: "{{ app_dir }}/docker-compose.yml"
        owner: "{{ ansible_user }}"
        mode: '0644'

    - name: Copy .env file
      template:
        src: ../templates/prospectflow/.env.j2
        dest: "{{ app_dir }}/.env"
        owner: "{{ ansible_user }}"
        mode: '0600'  # Permessi ristretti per secrets

    - name: Pull latest Docker images
      community.docker.docker_image:
        name: "{{ dockerhub_username }}/{{ item }}"
        source: pull
        tag: latest
      loop:
        - prospectflow-backend
        - prospectflow-frontend

    - name: Start ProspectFlow services
      community.docker.docker_compose:
        project_src: "{{ app_dir }}"
        pull: yes
        state: present

    - name: Wait for backend to be healthy
      wait_for:
        host: localhost
        port: 8000
        delay: 5
        timeout: 60

    - name: Run database migrations
      community.docker.docker_container_exec:
        container: prospectflow_backend
        command: python manage.py migrate --noinput

    - name: Collect static files
      community.docker.docker_container_exec:
        container: prospectflow_backend
        command: python manage.py collectstatic --noinput

    - name: Create Django superuser (optional, interactive)
      community.docker.docker_container_exec:
        container: prospectflow_backend
        command: python manage.py createsuperuser
      ignore_errors: yes
      when: create_superuser | default(false)

    - name: Verify services are running
      community.docker.docker_container_info:
        name: "{{ item }}"
      register: container_info
      failed_when: not container_info.exists or container_info.container.State.Status != 'running'
      loop:
        - prospectflow_backend
        - prospectflow_frontend
        - prospectflow_celery
        - prospectflow_redis
```

#### 4.2 Template Files

**File**: `templates/prospectflow/docker-compose.yml.j2`

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: prospectflow_redis
    restart: unless-stopped
    networks:
      - prospectflow_internal
    volumes:
      - ./volumes/redis_data:/data

  backend:
    image: {{ dockerhub_username }}/prospectflow-backend:latest
    container_name: prospectflow_backend
    restart: unless-stopped
    env_file: .env
    depends_on:
      - redis
    networks:
      - prospectflow_internal
      - {{ traefik_network }}
    volumes:
      - ./volumes/staticfiles:/app/staticfiles
      - ./volumes/media:/app/media
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network={{ traefik_network }}"
      - "traefik.http.routers.prospectflow-api.rule=Host(`{{ prospectflow_domain }}`) && PathPrefix(`/api`, `/admin`, `/static`, `/media`)"
      - "traefik.http.routers.prospectflow-api.entrypoints=websecure"
      - "traefik.http.routers.prospectflow-api.tls=true"
      - "traefik.http.routers.prospectflow-api.tls.certresolver={{ certresolver_name }}"
      - "traefik.http.services.prospectflow-api.loadbalancer.server.port=8000"

  celery:
    image: {{ dockerhub_username }}/prospectflow-backend:latest
    container_name: prospectflow_celery
    restart: unless-stopped
    command: celery -A config worker -l info
    env_file: .env
    depends_on:
      - redis
      - backend
    networks:
      - prospectflow_internal
    volumes:
      - ./volumes/media:/app/media

  frontend:
    image: {{ dockerhub_username }}/prospectflow-frontend:latest
    container_name: prospectflow_frontend
    restart: unless-stopped
    networks:
      - {{ traefik_network }}
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network={{ traefik_network }}"
      - "traefik.http.routers.prospectflow-frontend.rule=Host(`{{ prospectflow_domain }}`)"
      - "traefik.http.routers.prospectflow-frontend.entrypoints=websecure"
      - "traefik.http.routers.prospectflow-frontend.tls=true"
      - "traefik.http.routers.prospectflow-frontend.tls.certresolver={{ certresolver_name }}"
      - "traefik.http.services.prospectflow-frontend.loadbalancer.server.port=80"

networks:
  prospectflow_internal:
    driver: bridge
  {{ traefik_network }}:
    external: true
```

**File**: `templates/prospectflow/.env.j2`

```bash
# DockerHub
DOCKERHUB_USERNAME={{ dockerhub_username }}

# Django
DEBUG=False
SECRET_KEY={{ vault_django_secret_key }}
ALLOWED_HOSTS={{ prospectflow_domain }}

# Database
DB_NAME={{ db_name }}
DB_USER={{ db_user }}
DB_PASSWORD={{ vault_db_password }}
DB_HOST={{ db_host }}
DB_PORT={{ db_port | default(5432) }}

# Redis
REDIS_URL=redis://redis:6379/0

# CORS
CORS_ALLOWED_ORIGINS=https://{{ prospectflow_domain }}

# Email (optional)
EMAIL_HOST={{ email_host | default('smtp.gmail.com') }}
EMAIL_PORT={{ email_port | default(587) }}
EMAIL_USE_TLS=True
EMAIL_HOST_USER={{ vault_email_user | default('') }}
EMAIL_HOST_PASSWORD={{ vault_email_password | default('') }}

# Sentry (optional)
SENTRY_DSN={{ sentry_dsn | default('') }}

# File uploads
MAX_UPLOAD_SIZE=10485760
```

#### 4.3 Inventory Variables

**File**: `inventory/production.yml` (aggiungi variabili)

```yaml
all:
  hosts:
    production:
      ansible_host: YOUR_SERVER_IP
      ansible_user: deploy

      # ProspectFlow specifico
      prospectflow_domain: prospectflow.tuodominio.com
      traefik_network: traefik_network  # Nome network Traefik esistente
      certresolver_name: letsencrypt    # Nome certresolver Traefik

      # Database
      db_name: prospectflow_db
      db_user: prospectflow
      db_host: postgres  # O IP se esterno
      db_port: 5432
```

#### 4.4 Ansible Vault (Secrets)

```bash
# Crea/edita vault
ansible-vault edit group_vars/all/vault.yml

# Aggiungi secrets:
---
vault_dockerhub_username: tuo_username
vault_django_secret_key: "CHIAVE_RANDOM_50_CARATTERI"
vault_db_password: "PASSWORD_POSTGRES_FORTE"
vault_email_user: "your-email@gmail.com"
vault_email_password: "your-app-password"
```

---

### FASE 5: Deploy

#### 5.1 Test Playbook Ansible

```bash
# Dry-run (check mode)
ansible-playbook -i inventory/production.yml playbooks/deploy_prospectflow.yml --check --ask-vault-pass

# Deploy reale
ansible-playbook -i inventory/production.yml playbooks/deploy_prospectflow.yml --ask-vault-pass
```

#### 5.2 Deploy Manuale (alternativa senza Ansible)

Se preferisci deploy manuale via SSH:

```bash
# 1. SSH al server
ssh user@your-server-ip

# 2. Naviga directory app
cd /opt/prospectflow

# 3. Pull immagini latest
docker compose pull

# 4. Start services
docker compose up -d

# 5. Verifica containers running
docker compose ps

# 6. Run migrations
docker compose exec backend python manage.py migrate

# 7. Collect static
docker compose exec backend python manage.py collectstatic --noinput

# 8. Create superuser (interattivo)
docker compose exec backend python manage.py createsuperuser
```

---

### FASE 6: Verifica e Test

#### 6.1 Verifica Containers

```bash
# Lista containers ProspectFlow
docker compose ps

# Dovrebbero essere tutti "Up" (running)
# - prospectflow_backend
# - prospectflow_frontend
# - prospectflow_celery
# - prospectflow_redis

# Logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f celery
```

#### 6.2 Verifica SSL/TLS

```bash
# Check certificato Let's Encrypt
curl -I https://prospectflow.tuodominio.com

# Dovrebbe rispondere 200 OK con header HTTPS
```

#### 6.3 Test Endpoints

```bash
# Frontend
curl -I https://prospectflow.tuodominio.com
# Aspettato: 200 OK, Content-Type: text/html

# API Health (se implementato)
curl https://prospectflow.tuodominio.com/api/health/
# Aspettato: {"status": "ok"}

# API Docs
curl -I https://prospectflow.tuodominio.com/api/docs/
# Aspettato: 200 OK

# Django Admin
curl -I https://prospectflow.tuodominio.com/admin/
# Aspettato: 302 redirect o 200 OK
```

#### 6.4 Test Funzionale

1. **Apri browser**: https://prospectflow.tuodominio.com
2. **Registra account**: Click "Register" → Crea nuovo utente
3. **Login**: Inserisci credenziali
4. **Test upload**: Carica file CSV/XLSX di prova
5. **Verifica backend**: https://prospectflow.tuodominio.com/admin/
   - Login con superuser
   - Verifica dati nel database

#### 6.5 Verifica Database

```bash
# Connetti a PostgreSQL
docker exec -it postgres_container psql -U prospectflow -d prospectflow_db

# Verifica tabelle create da migrations
\dt

# Dovresti vedere tabelle Django:
# - auth_user
# - lists_contactlist
# - lists_contact
# - lists_activity
# - etc.

# Esci
\q
```

---

### FASE 7: Monitoring e Manutenzione

#### 7.1 Log Monitoring

```bash
# Logs in tempo reale
docker compose logs -f

# Solo backend
docker compose logs -f backend

# Solo Celery (per task asincroni)
docker compose logs -f celery

# Ultimi 100 righe
docker compose logs --tail=100
```

#### 7.2 Backup Database

```bash
# Backup manuale
docker exec postgres_container pg_dump -U prospectflow prospectflow_db > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i postgres_container psql -U prospectflow -d prospectflow_db < backup_20250129.sql
```

**Automatizza backup** con cron job:

```bash
# Aggiungi a crontab
0 2 * * * docker exec postgres_container pg_dump -U prospectflow prospectflow_db > /backups/prospectflow_$(date +\%Y\%m\%d).sql
```

#### 7.3 Update Immagini

Quando push nuovo codice su GitHub:

```bash
# 1. GitHub Actions builda automaticamente nuove immagini
# 2. Sul server, pull e restart:

cd /opt/prospectflow
docker compose pull
docker compose up -d

# Migrations (se necessario)
docker compose exec backend python manage.py migrate

# Verifica nessun downtime
docker compose ps
```

**Con Ansible**:

```bash
ansible-playbook -i inventory/production.yml playbooks/deploy_prospectflow.yml --ask-vault-pass --tags update
```

#### 7.4 Health Checks

Configura monitoring esterno:

- **Uptime monitoring**: UptimeRobot, Pingdom, StatusCake
- **URL**: https://prospectflow.tuodominio.com/api/health/
- **Intervallo**: 5 minuti
- **Alert**: Email/Slack quando down

---

### FASE 8: Troubleshooting

#### Problema: Container non si avvia

```bash
# Verifica logs errori
docker compose logs backend

# Errori comuni:
# - DB connection refused → Verifica DB_HOST in .env
# - Migration error → Run manualmente: docker compose exec backend python manage.py migrate
# - Permission denied → Verifica ownership volumes: sudo chown -R 1000:1000 volumes/
```

#### Problema: SSL non funziona

```bash
# Verifica Traefik logs
docker logs traefik_container_name | grep prospectflow

# Verifica DNS
dig prospectflow.tuodominio.com

# Verifica network
docker network inspect traefik_network | grep prospectflow
```

#### Problema: 502 Bad Gateway

```bash
# Backend non risponde
docker compose ps
docker compose logs backend

# Verifica porta 8000
docker compose exec backend netstat -tuln | grep 8000

# Restart backend
docker compose restart backend
```

#### Problema: Static files 404

```bash
# Collect static manualmente
docker compose exec backend python manage.py collectstatic --noinput

# Verifica volume mount
docker compose exec backend ls -la /app/staticfiles/

# Verifica Nginx serve static
curl -I https://prospectflow.tuodominio.com/static/admin/css/base.css
```

---

## Checklist Finale

Prima di considerare deploy completo:

- [ ] Database PostgreSQL creato e testato
- [ ] DNS configurato e propagato
- [ ] File docker-compose.yml configurato
- [ ] File .env con secrets configurato
- [ ] Network Traefik verificata
- [ ] Playbook Ansible testato (se usato)
- [ ] Containers tutti running (ps → Up)
- [ ] Migrations applicate
- [ ] Static files collected
- [ ] Superuser creato
- [ ] Frontend accessibile via HTTPS
- [ ] Backend API accessibile
- [ ] Django Admin funzionante
- [ ] SSL certificato Let's Encrypt attivo
- [ ] Logs puliti senza errori
- [ ] Test funzionale completo (upload file)
- [ ] Backup strategy configurato
- [ ] Monitoring setup (opzionale)

---

## File da Creare - Riepilogo

### Sul Server Production:
- `/opt/prospectflow/docker-compose.yml`
- `/opt/prospectflow/.env`
- `/opt/prospectflow/volumes/` (directories)

### Nel Repository Ansible (se usato):
- `playbooks/deploy_prospectflow.yml`
- `templates/prospectflow/docker-compose.yml.j2`
- `templates/prospectflow/.env.j2`
- `inventory/production.yml` (update variabili)
- `group_vars/all/vault.yml` (secrets)

### Provider DNS:
- Record A: `prospectflow.tuodominio.com` → `IP_SERVER`

---

## Note Finali

### Vantaggi Setup
✅ **Isolamento**: ProspectFlow ha propria network interna
✅ **SSL automatico**: Let's Encrypt via Traefik
✅ **Scalabile**: Aggiungi replica backend/celery facilmente
✅ **Manutenibile**: Update via pull immagini DockerHub
✅ **Sicuro**: Secrets in .env, database isolato

### Costi
- **Hosting**: Server esistente (nessun costo aggiuntivo)
- **Domain**: DNS già configurato
- **SSL**: Gratuito (Let's Encrypt)
- **DockerHub**: Free tier OK per immagini private

### Scaling Future
- **Horizontal**: `docker compose up -d --scale backend=3`
- **Database**: Read replica PostgreSQL
- **Cache**: Redis Cluster per Celery distribuito
- **Load Balancer**: Traefik già gestisce

---

Questo manuale copre deployment completo di ProspectFlow nel tuo ambiente production esistente. Segui step-by-step per integrazione senza downtime altre app.
