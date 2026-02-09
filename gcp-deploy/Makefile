# Makefile for GCP Deployment
# Quick commands for deploying SRE Platform to Google Cloud

.PHONY: help setup deploy redeploy cleanup logs status domain

# Default target
help:
	@echo "=========================================="
	@echo "  SRE Platform - GCP Deployment"
	@echo "=========================================="
	@echo ""
	@echo "Available commands:"
	@echo ""
	@echo "  make setup       - Full initial setup (all stages)"
	@echo "  make deploy      - Deploy/redeploy services only"
	@echo "  make redeploy    - Alias for deploy"
	@echo "  make domain      - Configure custom domain"
	@echo "  make logs        - View service logs"
	@echo "  make status      - Check deployment status"
	@echo "  make cleanup     - Delete all GCP resources"
	@echo ""
	@echo "Individual stages:"
	@echo "  make stage1      - Setup GCP project and APIs"
	@echo "  make stage2      - Setup Cloud SQL database"
	@echo "  make stage3      - Setup Secret Manager"
	@echo "  make stage4      - Build and deploy services"
	@echo "  make stage5      - Setup custom domain"
	@echo ""
	@echo "Monitoring:"
	@echo "  make logs-frontend   - Frontend logs"
	@echo "  make logs-backend    - Backend logs"
	@echo "  make logs-websocket  - WebSocket logs"
	@echo ""

# Make scripts executable
init:
	@chmod +x gcp-deploy/*.sh

# Full setup (all stages)
setup: init
	@echo "Running full GCP setup..."
	@./gcp-deploy/01-setup-gcp-project.sh
	@./gcp-deploy/02-setup-database.sh
	@./gcp-deploy/03-setup-secrets.sh
	@./gcp-deploy/04-build-and-deploy.sh
	@echo ""
	@echo "✅ Setup complete! Run 'make domain' to configure custom domain."

# Individual stages
stage1: init
	@./gcp-deploy/01-setup-gcp-project.sh

stage2: init
	@./gcp-deploy/02-setup-database.sh

stage3: init
	@./gcp-deploy/03-setup-secrets.sh

stage4: init
	@./gcp-deploy/04-build-and-deploy.sh

stage5: init
	@./gcp-deploy/05-setup-custom-domain.sh

# Deploy/redeploy services
deploy: init
	@./gcp-deploy/04-build-and-deploy.sh

redeploy: deploy

# Custom domain setup
domain: init
	@./gcp-deploy/05-setup-custom-domain.sh

# View logs
logs:
	@echo "Select service to view logs:"
	@echo "1) Frontend"
	@echo "2) Backend"
	@echo "3) WebSocket"
	@echo "4) All services"
	@read -p "Enter choice [1-4]: " choice; \
	case $$choice in \
		1) make logs-frontend ;; \
		2) make logs-backend ;; \
		3) make logs-websocket ;; \
		4) make logs-all ;; \
		*) echo "Invalid choice" ;; \
	esac

logs-frontend:
	@source gcp-deploy/config.sh && gcloud run services logs tail sre-frontend --region=$$REGION --project=$$PROJECT_ID

logs-backend:
	@source gcp-deploy/config.sh && gcloud run services logs tail sre-backend --region=$$REGION --project=$$PROJECT_ID

logs-websocket:
	@source gcp-deploy/config.sh && gcloud run services logs tail sre-websocket --region=$$REGION --project=$$PROJECT_ID

logs-all:
	@echo "Opening logs in separate terminals..."
	@osascript -e 'tell app "Terminal" to do script "cd $(PWD) && make logs-frontend"' || true
	@osascript -e 'tell app "Terminal" to do script "cd $(PWD) && make logs-backend"' || true
	@osascript -e 'tell app "Terminal" to do script "cd $(PWD) && make logs-websocket"' || true

# Check deployment status
status:
	@echo "=========================================="
	@echo "  Deployment Status"
	@echo "=========================================="
	@echo ""
	@echo "Cloud Run Services:"
	@source gcp-deploy/config.sh && gcloud run services list --region=$$REGION --project=$$PROJECT_ID 2>/dev/null || echo "No services deployed"
	@echo ""
	@echo "Cloud SQL Instances:"
	@source gcp-deploy/config.sh && gcloud sql instances list --project=$$PROJECT_ID 2>/dev/null || echo "No databases"
	@echo ""
	@echo "Secrets:"
	@source gcp-deploy/config.sh && gcloud secrets list --project=$$PROJECT_ID 2>/dev/null || echo "No secrets"
	@echo ""
	@if [ -f gcp-deploy/deployment-info.txt ]; then \
		echo "Service URLs:"; \
		cat gcp-deploy/deployment-info.txt | grep "https://"; \
	fi

# Cleanup all resources
cleanup: init
	@./gcp-deploy/99-cleanup.sh

# Quick test
test:
	@echo "Testing deployed services..."
	@if [ -f gcp-deploy/deployment-info.txt ]; then \
		FRONTEND_URL=$$(grep "Frontend:" gcp-deploy/deployment-info.txt | awk '{print $$2}'); \
		echo "Testing frontend: $$FRONTEND_URL"; \
		curl -I $$FRONTEND_URL; \
	else \
		echo "No deployment info found. Run 'make deploy' first."; \
	fi

# Show deployment info
info:
	@if [ -f gcp-deploy/deployment-info.txt ]; then \
		cat gcp-deploy/deployment-info.txt; \
	else \
		echo "No deployment info found. Run 'make deploy' first."; \
	fi

# Show database connection info
db-info:
	@if [ -f gcp-deploy/db-connection-info.txt ]; then \
		cat gcp-deploy/db-connection-info.txt; \
	else \
		echo "No database info found. Run 'make stage2' first."; \
	fi

# Connect to database
db-connect:
	@source gcp-deploy/config.sh && gcloud sql connect sre-platform-db --user=sre_user --project=$$PROJECT_ID
