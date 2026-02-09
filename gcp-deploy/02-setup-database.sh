#!/bin/bash

# Stage 2: Setup Cloud SQL Database with pgvector
# This script creates and configures the PostgreSQL database

set -e  # Exit on error

# Load configuration
source "$(dirname "$0")/config.sh"

echo "=========================================="
echo "  Stage 2: Cloud SQL Database Setup"
echo "=========================================="
echo ""

log_info "Database Instance: ${DB_INSTANCE_NAME}"
log_info "Database Name: ${DB_NAME}"
log_info "Database User: ${DB_USER}"
echo ""

# Ensure gcloud is authenticated
log_info "Checking gcloud authentication..."
ensure_gcloud_auth
echo ""

# Check if instance already exists
INSTANCE_EXISTS=false
DB_EXISTS=""
USER_EXISTS=""

if gcloud sql instances describe ${DB_INSTANCE_NAME} --project=${PROJECT_ID} &>/dev/null; then
    INSTANCE_EXISTS=true
    log_warning "Database instance ${DB_INSTANCE_NAME} already exists!"
    echo ""
    log_info "Checking if database and user need to be created..."
    
    # Check if database exists
    DB_EXISTS=$(gcloud sql databases list --instance=${DB_INSTANCE_NAME} --project=${PROJECT_ID} --format="value(name)" | grep -w "${DB_NAME}" || echo "")
    
    # Check if user exists
    USER_EXISTS=$(gcloud sql users list --instance=${DB_INSTANCE_NAME} --project=${PROJECT_ID} --format="value(name)" | grep -w "${DB_USER}" || echo "")
    
    if [ -n "$DB_EXISTS" ] && [ -n "$USER_EXISTS" ]; then
        log_success "Database '${DB_NAME}' and user '${DB_USER}' already exist!"
        echo ""
        log_info "Skipping database and user creation"
        echo ""
        log_success "✅ Stage 2 Complete (using existing database)!"
        echo ""
        echo "Next step: Run ./02b-run-migrations.sh"
        echo ""
        exit 0
    else
        log_warning "Database or user is missing. Will create them."
        echo ""
    fi
fi

# If instance doesn't exist, ask to create it
if [ "$INSTANCE_EXISTS" = false ]; then
    log_info "Instance does not exist. Will create it."
fi

# Create Cloud SQL instance only if it doesn't exist
if [ "$INSTANCE_EXISTS" = false ]; then
    log_info "Creating Cloud SQL PostgreSQL instance (this takes 5-10 minutes)..."
    log_warning "☕ This is a good time for a coffee break!"
    echo ""

    gcloud sql instances create ${DB_INSTANCE_NAME} \
        --database-version=POSTGRES_16 \
        --tier=db-perf-optimized-N-2 \
        --region=${REGION} \
        --project=${PROJECT_ID}

    log_success "Cloud SQL instance created!"
    log_info "Note: pgvector extension is available by default in PostgreSQL 16"
    log_info "You can enable it in your database with: CREATE EXTENSION vector;"
    echo ""

    # Set root password
    log_info "Setting postgres user password..."
    gcloud sql users set-password postgres \
        --instance=${DB_INSTANCE_NAME} \
        --password="${DB_PASSWORD}" \
        --project=${PROJECT_ID}

    log_success "Password set for postgres user"
    echo ""
else
    log_info "Using existing Cloud SQL instance"
    echo ""
fi

# Create application database if it doesn't exist
if [ -z "$DB_EXISTS" ]; then
    log_info "Creating application database: ${DB_NAME}..."
    gcloud sql databases create ${DB_NAME} \
        --instance=${DB_INSTANCE_NAME} \
        --project=${PROJECT_ID}

    log_success "Database ${DB_NAME} created!"
    echo ""
else
    log_info "Database ${DB_NAME} already exists, skipping creation"
    echo ""
fi

# Create application user if it doesn't exist
if [ -z "$USER_EXISTS" ]; then
    log_info "Creating application user: ${DB_USER}..."
    gcloud sql users create ${DB_USER} \
        --instance=${DB_INSTANCE_NAME} \
        --password="${DB_PASSWORD}" \
        --project=${PROJECT_ID}

    log_success "User ${DB_USER} created!"
    echo ""
else
    log_info "User ${DB_USER} already exists, skipping creation"
    echo ""
fi

# Enable pgvector extension
log_info "Enabling pgvector extension..."
log_info "Connecting to database to enable pgvector..."

# Get the instance IP
INSTANCE_IP=$(gcloud sql instances describe ${DB_INSTANCE_NAME} \
    --project=${PROJECT_ID} \
    --format="value(ipAddresses[0].ipAddress)")

log_info "Instance IP: ${INSTANCE_IP}"
echo ""

# Save connection info to file
cat > "$(dirname "$0")/db-connection-info.txt" <<EOF
Database Connection Information
================================
Instance Name: ${DB_INSTANCE_NAME}
Connection Name: ${CLOUD_SQL_CONNECTION}
Database: ${DB_NAME}
User: ${DB_USER}
Password: ${DB_PASSWORD}
Instance IP: ${INSTANCE_IP}

Connection String (for Cloud Run):
postgresql://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${CLOUD_SQL_CONNECTION}

Connection String (for local testing via proxy):
postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}

To connect via Cloud SQL Proxy:
gcloud sql connect ${DB_INSTANCE_NAME} --user=${DB_USER} --project=${PROJECT_ID}
EOF

log_success "Connection info saved to db-connection-info.txt"
echo ""

log_warning "⚠️  IMPORTANT: Save your database password!"
log_warning "Password: ${DB_PASSWORD}"
echo ""

log_success "✅ Stage 2 Complete!"
echo ""
echo "Next step: Run ./03-setup-secrets.sh"
echo ""
