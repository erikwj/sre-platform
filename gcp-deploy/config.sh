#!/bin/bash

# GCP Deployment Configuration
# Auto-extracted from google-service-account-key.json

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Check if google-service-account-key.json exists
if [ ! -f "${PROJECT_ROOT}/google-service-account-key.json" ]; then
    echo "ERROR: google-service-account-key.json not found in project root!"
    echo "Please ensure the file exists at: ${PROJECT_ROOT}/google-service-account-key.json"
    exit 1
fi

# Extract configuration from google-service-account-key.json
export PROJECT_ID=$(grep -o '"project_id"[[:space:]]*:[[:space:]]*"[^"]*"' "${PROJECT_ROOT}/google-service-account-key.json" | cut -d'"' -f4)
export SERVICE_ACCOUNT_EMAIL=$(grep -o '"client_email"[[:space:]]*:[[:space:]]*"[^"]*"' "${PROJECT_ROOT}/google-service-account-key.json" | cut -d'"' -f4)
export REGION="us-central1"

# Validate extracted values
if [ -z "$PROJECT_ID" ]; then
    echo "ERROR: Could not extract project_id from google-service-account-key.json"
    exit 1
fi

if [ -z "$SERVICE_ACCOUNT_EMAIL" ]; then
    echo "ERROR: Could not extract client_email from google-service-account-key.json"
    exit 1
fi

# Database Configuration
export DB_INSTANCE_NAME="sre-platform-db"
export DB_NAME="sre_platform"
export DB_USER="sre_user"
export DB_PASSWORD="sre_secure_password_$(date +%s)"  # Generate unique password each time

# Cloud Run Services
export BACKEND_SERVICE="sre-backend"
export FRONTEND_SERVICE="sre-frontend"
export WEBSOCKET_SERVICE="sre-websocket"

# ServiceNow Configuration (from .env)
export SERVICENOW_INSTANCE_URL="https://dev193219.service-now.com"
export SERVICENOW_USERNAME="admin"
export SERVICENOW_PASSWORD="enc:8ee9d8043a8d43044f29b0a240b1cbd8:1226fe0ac98e4ea9c7c4104761c1df0d"

# Cloud SQL Connection
export CLOUD_SQL_CONNECTION="${PROJECT_ID}:${REGION}:${DB_INSTANCE_NAME}"

# Colors for output
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export RED='\033[0;31m'
export BLUE='\033[0;34m'
export NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

wait_for_operation() {
    local operation=$1
    local max_wait=${2:-300}  # Default 5 minutes
    local waited=0
    
    log_info "Waiting for operation to complete..."
    while [ $waited -lt $max_wait ]; do
        sleep 5
        waited=$((waited + 5))
        echo -n "."
    done
    echo ""
}

# Ensure gcloud is authenticated
ensure_gcloud_auth() {
    local CURRENT_ACCOUNT=$(gcloud config get-value account 2>/dev/null || echo "")
    
    if [ -z "$CURRENT_ACCOUNT" ]; then
        log_error "No active gcloud account found!"
        echo ""
        log_info "Please run the authentication helper first:"
        echo ""
        echo "  ./00-authenticate.sh"
        echo ""
        log_info "Or authenticate manually with:"
        echo ""
        echo "  gcloud auth login"
        echo "  gcloud config set project ${PROJECT_ID}"
        echo ""
        exit 1
    else
        log_success "Authenticated as ${CURRENT_ACCOUNT}"
        
        # Warn if using service account
        if [[ "$CURRENT_ACCOUNT" == *"@"*".iam.gserviceaccount.com" ]]; then
            log_warning "⚠️  Using service account - may have limited permissions"
            log_warning "If you encounter permission errors, authenticate with a user account"
        fi
    fi
}
