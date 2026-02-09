#!/bin/bash

# Stage 2b: Run Liquibase Migrations (Full Docker version)
# This script runs database migrations using Liquibase in Docker
# No local installations required - everything runs in containers

set -e  # Exit on error

# Load configuration
source "$(dirname "$0")/config.sh"

echo "=========================================="
echo "  Stage 2b: Run Database Migrations"
echo "  (Full Docker - No local installs)"
echo "=========================================="
echo ""

# Ensure gcloud is authenticated
log_info "Checking gcloud authentication..."
ensure_gcloud_auth
echo ""

# Load database password from connection info if it exists
if [ -f "$(dirname "$0")/db-connection-info.txt" ]; then
    DB_PASSWORD=$(grep "Password:" "$(dirname "$0")/db-connection-info.txt" | cut -d' ' -f2)
    log_success "Loaded database password from db-connection-info.txt"
else
    log_error "db-connection-info.txt not found!"
    log_info "Please run ./02-setup-database.sh first"
    exit 1
fi

echo ""

# Get the service account key path
SERVICE_ACCOUNT_KEY="$(dirname "$0")/../google-service-account-key.json"
if [ ! -f "$SERVICE_ACCOUNT_KEY" ]; then
    log_error "Service account key not found at: $SERVICE_ACCOUNT_KEY"
    exit 1
fi

log_success "Found service account key"
echo ""

# Create a Docker network for the containers
NETWORK_NAME="liquibase-migration-network"
log_info "Creating Docker network: ${NETWORK_NAME}..."
docker network create ${NETWORK_NAME} 2>/dev/null || log_info "Network already exists"
echo ""

# Start Cloud SQL Proxy in a container
# Important: Use --address 0.0.0.0 so other containers can connect
log_info "Starting Cloud SQL Proxy container..."
docker run -d \
    --name cloudsql-proxy-temp \
    --network ${NETWORK_NAME} \
    -v "${SERVICE_ACCOUNT_KEY}:/config/key.json:ro" \
    gcr.io/cloud-sql-connectors/cloud-sql-proxy:latest \
    --credentials-file=/config/key.json \
    --address=0.0.0.0 \
    ${CLOUD_SQL_CONNECTION}

log_success "Cloud SQL Proxy container started"
echo ""

# Wait for proxy to be ready
log_info "Waiting for Cloud SQL Proxy to be ready..."
sleep 15

# Check if proxy is actually ready by checking container logs
log_info "Verifying proxy connection..."
sleep 5
log_success "Proxy should be ready"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Build custom Liquibase image with PostgreSQL driver (if not already built)
if ! docker image inspect liquibase-postgres:local >/dev/null 2>&1; then
    log_info "Building Liquibase image with PostgreSQL driver..."
    docker build -t liquibase-postgres:local -f "$(dirname "$0")/Dockerfile.liquibase" "$(dirname "$0")"
    log_success "Liquibase image built"
    echo ""
else
    log_info "Liquibase image already exists, skipping build"
    echo ""
fi

# Run Liquibase migrations using Docker
log_info "Running Liquibase migrations..."
echo ""

# The Cloud SQL Proxy listens on port 5432 inside the container
LIQUIBASE_URL="jdbc:postgresql://cloudsql-proxy-temp:5432/${DB_NAME}"

log_info "Database URL: ${LIQUIBASE_URL}"
echo ""

# Run Liquibase with PostgreSQL driver
# Mount the entire project root so relative paths in changelog work
docker run --rm \
    --network ${NETWORK_NAME} \
    -v "$(pwd):/workspace:ro" \
    -w /workspace \
    liquibase-postgres:local \
    --changelog-file=liquibase/db.changelog-master.xml \
    --url="${LIQUIBASE_URL}" \
    --username="${DB_USER}" \
    --password="${DB_PASSWORD}" \
    update

MIGRATION_STATUS=$?

echo ""

# Cleanup: Stop and remove Cloud SQL Proxy container
log_info "Cleaning up Cloud SQL Proxy container..."
docker stop cloudsql-proxy-temp >/dev/null 2>&1 || true
docker rm cloudsql-proxy-temp >/dev/null 2>&1 || true
log_success "Cleanup complete"
echo ""

# Cleanup: Remove Docker network
log_info "Removing Docker network..."
docker network rm ${NETWORK_NAME} >/dev/null 2>&1 || true
echo ""

if [ $MIGRATION_STATUS -eq 0 ]; then
    log_success "✅ Migrations completed successfully!"
    echo ""
    log_success "✅ Stage 2b Complete!"
    echo ""
    echo "Database schema is now up to date!"
    echo ""
    echo "Next step: Run ./03-setup-secrets.sh"
    echo ""
    exit 0
else
    log_error "❌ Migrations failed!"
    exit 1
fi
