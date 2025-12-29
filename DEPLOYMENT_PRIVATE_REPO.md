# Piano: Repository Privato per Production Deployment

**NOTA**: Questo file contiene il piano per creare il repository privato `prospecting-deploy`.
Eseguire DOPO aver completato Step 1 (file production nel repo pubblico).

---

## Struttura Repository Privato `prospecting-deploy`

```
prospecting-deploy/
├── README.md
├── ansible/
│   ├── inventory/
│   │   ├── production.yml          # IP e hostname server
│   │   └── staging.yml              # (opzionale)
│   ├── roles/
│   │   ├── docker/                  # Installa Docker
│   │   ├── traefik/                 # Setup Traefik
│   │   ├── prospectflow/            # Deploy app
│   │   └── monitoring/              # Prometheus/Grafana (opzionale)
│   ├── playbooks/
│   │   ├── setup.yml                # Initial server setup
│   │   ├── deploy.yml               # Deploy app
│   │   └── backup.yml               # Database backups
│   └── ansible.cfg
├── docker/
│   ├── docker-compose.prod.yml      # Production orchestration
│   ├── .env.production              # SECRETS (gitignored? o vaulted)
│   └── traefik/
│       ├── traefik.yml              # Traefik config
│       └── acme.json                # Let's Encrypt certs (gitignored)
├── .github/
│   └── workflows/
│       └── deploy.yml               # GitHub Actions CD
├── scripts/
│   ├── backup.sh                    # DB backup script
│   └── restore.sh                   # DB restore script
├── prospecting/                     # Submodule al repo pubblico
└── .gitignore
```

---

## File da Creare

### docker-compose.prod.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    env_file: .env.production
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - backend
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    networks:
      - backend
    restart: unless-stopped

  django:
    build:
      context: ./prospecting/backend
      dockerfile: Dockerfile.prod
    env_file: .env.production
    volumes:
      - static_files:/app/staticfiles
      - media_files:/app/media
    depends_on:
      - postgres
      - redis
    networks:
      - backend
    restart: unless-stopped
    labels:
      - "traefik.enable=false"  # Nginx handles backend

  celery:
    build:
      context: ./prospecting/backend
      dockerfile: Dockerfile.prod
    command: celery -A config worker -l info
    env_file: .env.production
    depends_on:
      - postgres
      - redis
    networks:
      - backend
    restart: unless-stopped

  nginx:
    build:
      context: ./prospecting/nginx
    volumes:
      - static_files:/app/staticfiles:ro
      - media_files:/app/media:ro
    depends_on:
      - django
    networks:
      - backend
      - web
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.yourdomain.com`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      - "traefik.http.services.api.loadbalancer.server.port=80"

  frontend:
    build:
      context: ./prospecting/frontend
      dockerfile: Dockerfile.prod
    networks:
      - web
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`yourdomain.com`)"
      - "traefik.http.routers.frontend.entrypoints=websecure"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
      - "traefik.http.services.frontend.loadbalancer.server.port=80"

  traefik:
    image: traefik:v2.11
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=your-email@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik/acme.json:/letsencrypt/acme.json
    networks:
      - web
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`traefik.yourdomain.com`)"
      - "traefik.http.routers.dashboard.service=api@internal"
      - "traefik.http.routers.dashboard.middlewares=auth"
      - "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$..."

volumes:
  postgres_data:
  static_files:
  media_files:

networks:
  web:
    driver: bridge
  backend:
    driver: bridge
```

### ansible/inventory/production.yml

```yaml
all:
  hosts:
    production:
      ansible_host: YOUR_SERVER_IP
      ansible_user: deploy
      ansible_python_interpreter: /usr/bin/python3
  vars:
    domain: yourdomain.com
    email: your-email@example.com
    app_dir: /opt/prospectflow
```

### ansible/playbooks/deploy.yml

```yaml
---
- name: Deploy ProspectFlow
  hosts: production
  become: yes

  tasks:
    - name: Update submodule
      git:
        repo: https://github.com/yourusername/prospecting-deploy.git
        dest: "{{ app_dir }}"
        update: yes
        recursive: yes

    - name: Copy environment file
      copy:
        src: ../docker/.env.production
        dest: "{{ app_dir }}/docker/.env.production"
        mode: '0600'

    - name: Pull latest images
      community.docker.docker_compose:
        project_src: "{{ app_dir }}/docker"
        pull: yes

    - name: Build and start services
      community.docker.docker_compose:
        project_src: "{{ app_dir }}/docker"
        build: yes
        state: present

    - name: Run migrations
      community.docker.docker_container_exec:
        container: docker_django_1
        command: python manage.py migrate --noinput
```

### .github/workflows/deploy.yml

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          submodules: recursive

      - name: Setup Ansible
        run: |
          sudo apt-get update
          sudo apt-get install -y ansible

      - name: Setup SSH key
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H ${{ secrets.SERVER_IP }} >> ~/.ssh/known_hosts

      - name: Deploy with Ansible
        run: |
          cd ansible
          ansible-playbook playbooks/deploy.yml -i inventory/production.yml
```

### .gitignore

```
# Secrets
.env.production
*.pem
*.key

# Traefik
traefik/acme.json

# Ansible
*.retry

# Backups
backups/

# IDE
.vscode/
.idea/
```

---

## Setup Commands

### Inizializzare Repository Privato

```bash
# 1. Crea repo privato su GitHub
# Nome: prospecting-deploy

# 2. Clone locale
git clone git@github.com:yourusername/prospecting-deploy.git
cd prospecting-deploy

# 3. Aggiungi submodule al repo pubblico
git submodule add https://github.com/yourusername/prospecting.git
git submodule update --init --recursive

# 4. Crea struttura cartelle
mkdir -p ansible/{inventory,roles,playbooks}
mkdir -p docker/traefik
mkdir -p .github/workflows
mkdir -p scripts

# 5. Crea .gitignore
cat > .gitignore << EOF
.env.production
*.pem
*.key
traefik/acme.json
*.retry
backups/
.vscode/
.idea/
EOF

# 6. Crea README.md iniziale
cat > README.md << EOF
# ProspectFlow Production Deployment

Private repository for production deployment configurations.

## Setup

1. Ensure prospecting submodule is up to date
2. Configure ansible/inventory/production.yml with server details
3. Create docker/.env.production with production secrets
4. Run ansible/playbooks/setup.yml for initial server setup
5. Run ansible/playbooks/deploy.yml to deploy application

## Updating Application

git submodule update --remote --merge
git add prospecting
git commit -m "Update prospecting to latest"
git push
EOF

# 7. Commit iniziale
git add .
git commit -m "Initial setup of private deployment repository"
git push origin main
```

### Aggiornare Submodule

```bash
cd prospecting-deploy
git submodule update --remote --merge
git add prospecting
git commit -m "Update prospecting submodule to latest"
git push
```

---

## GitHub Secrets da Configurare

Nel repository privato `prospecting-deploy`:

- `SSH_PRIVATE_KEY`: Chiave SSH privata per accesso server
- `SERVER_IP`: Indirizzo IP del server production

---

## Workflow Deployment

1. **Initial Setup** (una volta sola):
   ```bash
   cd ansible
   ansible-playbook playbooks/setup.yml -i inventory/production.yml
   ```

2. **Deploy Manuale**:
   ```bash
   ansible-playbook playbooks/deploy.yml -i inventory/production.yml
   ```

3. **Deploy Automatico**:
   - Push a `main` triggera GitHub Actions
   - Actions esegue Ansible playbook
   - Zero-downtime deployment

---

## Note di Sicurezza

⚠️ **Mai committare**:
- `.env.production` con secrets reali
- Chiavi SSH
- Certificati SSL non auto-generated
- IP server production

✅ **Ansible Vault** (opzionale ma raccomandato):
```bash
# Encrypt .env.production
ansible-vault encrypt docker/.env.production

# Deploy con vault password
ansible-playbook deploy.yml -i inventory/production.yml --ask-vault-pass
```

---

**Questo file sarà usato DOPO Step 1 per creare il repository privato.**
