#!/bin/bash

# Cleanup Script: Delete all GCP resources
# Use this to clean up after the hackathon or when sandbox expires

set -e  # Exit on error

# Load configuration
source "$(dirname "$0")/config.sh"

echo "=========================================="
echo "  ⚠️  CLEANUP: Delete All Resources"
echo "=========================================="
echo ""

log_warning "This will DELETE all deployed resources!"
log_warning "This action CANNOT be undone!"
echo ""

read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    log_info "Cleanup cancelled"
    exit 0
fi

echo ""
log_info "Starting cleanup process..."
echo ""

# Delete Cloud Run services
log_info "Deleting Cloud Run services..."
gcloud run services delete ${FRONTEND_SERVICE} --region=${REGION} --project=${PROJECT_ID} --quiet 2>/dev/null || true
gcloud run services delete ${BACKEND_SERVICE} --region=${REGION} --project=${PROJECT_ID} --quiet 2>/dev/null || true
gcloud run services delete ${WEBSOCKET_SERVICE} --region=${REGION} --project=${PROJECT_ID} --quiet 2>/dev/null || true
log_success "Cloud Run services deleted"
echo ""

# Delete Cloud SQL instance
log_info "Deleting Cloud SQL instance (this takes a few minutes)..."
gcloud sql instances delete ${DB_INSTANCE_NAME} --project=${PROJECT_ID} --quiet 2>/dev/null || true
log_success "Cloud SQL instance deleted"
echo ""

# Delete secrets
log_info "Deleting secrets..."
gcloud secrets delete db-password --project=${PROJECT_ID} --quiet 2>/dev/null || true
gcloud secrets delete db-user --project=${PROJECT_ID} --quiet 2>/dev/null || true
gcloud secrets delete db-name --project=${PROJECT_ID} --quiet 2>/dev/null || true
gcloud secrets delete servicenow-password --project=${PROJECT_ID} --quiet 2>/dev/null || true
gcloud secrets delete servicenow-username --project=${PROJECT_ID} --quiet 2>/dev/null || true
gcloud secrets delete servicenow-instance-url --project=${PROJECT_ID} --quiet 2>/dev/null || true
log_success "Secrets deleted"
echo ""

# Delete Artifact Registry repository
log_info "Deleting Artifact Registry repository..."
gcloud artifacts repositories delete sre-platform \
    --location=${REGION} \
    --project=${PROJECT_ID} \
    --quiet 2>/dev/null || true
log_success "Artifact Registry repository deleted"
echo ""

# Clean up local files
log_info "Cleaning up local configuration files..."
rm -f "$(dirname "$0")/db-connection-info.txt"
rm -f "$(dirname "$0")/deployment-info.txt"
rm -f "$(dirname "$0")/domain-config.txt"
log_success "Local files cleaned"
echo ""

log_success "✅ Cleanup Complete!"
echo ""
echo "All GCP resources have been deleted."
echo "You can now run the setup scripts again for a fresh deployment."
echo ""
