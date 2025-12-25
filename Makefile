.PHONY: help dev up down build clean migrate makemigrations shell superuser logs test

help:  ## Show this help message
	@echo "ProspectFlow - Development Commands"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: up migrate  ## Start development environment (up + migrate)

up:  ## Start all services
	docker compose up 
	@echo "✓ Services started"
	@echo "  Django:  http://localhost:8000"
	@echo "  API Docs: http://localhost:8000/api/docs/"
	@echo "  Admin:    http://localhost:8000/admin/"

down:  ## Stop all services
	docker compose down
	@echo "✓ Services stopped"

build:  ## Build Docker images
	docker compose build
	@echo "✓ Images built"

clean:  ## Stop services and remove volumes (WARNING: deletes data)
	docker compose down -v
	@echo "✓ Services stopped and volumes removed"

migrate:  ## Run database migrations
	docker compose exec django python manage.py migrate
	@echo "✓ Migrations applied"

makemigrations:  ## Create new migrations
	docker compose exec django python manage.py makemigrations
	@echo "✓ Migrations created"

shell:  ## Open Django shell
	docker compose exec django python manage.py shell

dbshell:  ## Open PostgreSQL shell
	docker compose exec postgres psql -U prospectflow -d prospectflow

superuser:  ## Create superuser
	docker compose exec django python manage.py createsuperuser

logs:  ## Show logs for all services
	docker compose logs -f

logs-django:  ## Show Django logs
	docker compose logs -f django

logs-celery:  ## Show Celery logs
	docker compose logs -f celery

test:  ## Run tests (not implemented yet)
	docker compose exec django python manage.py test
	@echo "✓ Tests completed"

collectstatic:  ## Collect static files
	docker compose exec django python manage.py collectstatic --noinput
	@echo "✓ Static files collected"

install-deps:  ## Install/update Python dependencies
	docker compose exec django pip install -r requirements.txt
	@echo "✓ Dependencies installed"

restart:  ## Restart all services
	docker compose restart
	@echo "✓ Services restarted"

restart-django:  ## Restart Django service
	docker compose restart django
	@echo "✓ Django restarted"

restart-celery:  ## Restart Celery worker
	docker compose restart celery
	@echo "✓ Celery restarted"

ps:  ## Show running services
	docker compose ps

setup: build up migrate superuser  ## Full setup: build, start, migrate, create superuser
	@echo "✓ Setup complete!"
	@echo "  Visit http://localhost:8000/admin/ to login"
