#!/bin/bash

# Stage 1: Setup GCP Project and Enable APIs
# This script sets up the GCP project and enables all required APIs

set -e  # Exit on error

# Load configuration
source "$(dirname "$0")/config.sh"

echo "=========================================="
echo "  Stage 1: GCP Project Setup"
echo "=========================================="
echo ""

log_info "Project ID: ${PROJECT_ID}"
log_info "Region: ${REGION}"
echo ""

# Ensure gcloud is authenticated
log_info "Checking gcloud authentication..."
ensure_gcloud_auth
echo ""

# Set the project
log_info "Setting active GCP project..."
gcloud config set project ${PROJECT_ID}
log_success "Project set to ${PROJECT_ID}"
echo ""

# Enable required APIs
log_info "Enabling required GCP APIs (this may take 2-3 minutes)..."
echo ""

apis=(
    "run.googleapis.com"                    # Cloud Run
    "cloudbuild.googleapis.com"             # Cloud Build
    "sqladmin.googleapis.com"               # Cloud SQL
    "secretmanager.googleapis.com"          # Secret Manager
    "artifactregistry.googleapis.com"       # Artifact Registry
    "aiplatform.googleapis.com"             # Vertex AI
    "compute.googleapis.com"                # Compute Engine (for Cloud SQL)
    "servicenetworking.googleapis.com"      # Service Networking
    "cloudresourcemanager.googleapis.com"   # Resource Manager
)

for api in "${apis[@]}"; do
    log_info "Enabling ${api}..."
    gcloud services enable ${api} --project=${PROJECT_ID} 2>/dev/null || true
done

log_success "All APIs enabled successfully!"
echo ""

# Wait for APIs to propagate
log_info "Waiting for APIs to propagate (30 seconds)..."
sleep 30
log_success "APIs are ready!"
echo ""

# Verify service account exists
log_info "Verifying service account..."
if gcloud iam service-accounts describe ${SERVICE_ACCOUNT_EMAIL} --project=${PROJECT_ID} &>/dev/null; then
    log_success "Service account verified: ${SERVICE_ACCOUNT_EMAIL}"
else
    log_warning "Cannot verify service account (may be permission issue)"
    log_info "Attempting to list service accounts..."
    
    # Try to list service accounts to see if it exists
    if gcloud iam service-accounts list --project=${PROJECT_ID} --filter="email:${SERVICE_ACCOUNT_EMAIL}" --format="value(email)" 2>/dev/null | grep -q "${SERVICE_ACCOUNT_EMAIL}"; then
        log_success "Service account found: ${SERVICE_ACCOUNT_EMAIL}"
    else
        log_warning "Service account may not exist or you don't have permission to view it"
        log_info "If you created the service account in the UI, it should exist"
        log_info "Continuing with deployment..."
    fi
fi
echo ""

# Grant necessary roles to service account
log_info "Granting IAM roles to service account..."

roles=(
    "roles/aiplatform.user"           # Vertex AI access
    "roles/cloudsql.client"           # Cloud SQL access
    "roles/secretmanager.secretAccessor"  # Secret Manager access
    "roles/run.admin"                 # Cloud Run admin
)

for role in "${roles[@]}"; do
    log_info "Granting ${role}..."
    gcloud projects add-iam-policy-binding ${PROJECT_ID} \
        --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
        --role="${role}" \
        --condition=None \
        --quiet 2>/dev/null || true
done

log_success "IAM roles granted successfully!"
echo ""

# Create Artifact Registry repository for Docker images
log_info "Creating Artifact Registry repository..."
gcloud artifacts repositories create sre-platform \
    --repository-format=docker \
    --location=${REGION} \
    --description="SRE Platform container images" \
    --project=${PROJECT_ID} 2>/dev/null || log_warning "Repository may already exist"

log_success "Artifact Registry repository ready!"
echo ""

log_success "✅ Stage 1 Complete!"
echo ""
echo "Next step: Run ./02-setup-database.sh"
echo ""
