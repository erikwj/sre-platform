#!/bin/bash

# Authentication Helper Script
# This script helps you authenticate with GCP properly for deployment

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

echo "=========================================="
echo "  GCP Authentication Helper"
echo "=========================================="
echo ""

# Check if google-service-account-key.json exists
if [ ! -f "${PROJECT_ROOT}/google-service-account-key.json" ]; then
    log_error "google-service-account-key.json not found in project root!"
    echo ""
    echo "Please ensure the file exists at: ${PROJECT_ROOT}/google-service-account-key.json"
    exit 1
fi

# Extract project ID
PROJECT_ID=$(grep -o '"project_id"[[:space:]]*:[[:space:]]*"[^"]*"' "${PROJECT_ROOT}/google-service-account-key.json" | cut -d'"' -f4)
SERVICE_ACCOUNT_EMAIL=$(grep -o '"client_email"[[:space:]]*:[[:space:]]*"[^"]*"' "${PROJECT_ROOT}/google-service-account-key.json" | cut -d'"' -f4)

log_info "Project ID: ${PROJECT_ID}"
log_info "Service Account: ${SERVICE_ACCOUNT_EMAIL}"
echo ""

# Check current authentication
CURRENT_ACCOUNT=$(gcloud config get-value account 2>/dev/null || echo "")

if [ -n "$CURRENT_ACCOUNT" ]; then
    log_info "Currently authenticated as: ${CURRENT_ACCOUNT}"
    echo ""
    
    # Check if it's a service account or user account
    if [[ "$CURRENT_ACCOUNT" == *"@"*".iam.gserviceaccount.com" ]]; then
        log_warning "You are authenticated with a SERVICE ACCOUNT"
        log_warning "Service accounts have limited permissions for deployment scripts"
        echo ""
        log_info "RECOMMENDED: Authenticate with a USER account that has Owner/Editor role"
        echo ""
        echo "Options:"
        echo "  1. Authenticate with your Google user account (RECOMMENDED)"
        echo "  2. Continue with service account (may have permission issues)"
        echo "  3. Exit and grant more permissions to the service account"
        echo ""
        read -p "Choose option (1/2/3): " choice
        
        case $choice in
            1)
                log_info "Authenticating with user account..."
                gcloud auth login
                gcloud config set project ${PROJECT_ID}
                log_success "Authenticated with user account!"
                ;;
            2)
                log_warning "Continuing with service account..."
                log_warning "You may encounter permission errors during deployment"
                ;;
            3)
                echo ""
                log_info "To grant permissions to the service account, run these commands:"
                echo ""
                echo "  gcloud projects add-iam-policy-binding ${PROJECT_ID} \\"
                echo "    --member=\"serviceAccount:${SERVICE_ACCOUNT_EMAIL}\" \\"
                echo "    --role=\"roles/owner\""
                echo ""
                exit 0
                ;;
            *)
                log_error "Invalid option"
                exit 1
                ;;
        esac
    else
        log_success "Authenticated with user account - good to go!"
    fi
else
    log_warning "No active gcloud account found"
    echo ""
    echo "How would you like to authenticate?"
    echo "  1. User account (RECOMMENDED for deployment)"
    echo "  2. Service account (limited permissions)"
    echo ""
    read -p "Choose option (1/2): " choice
    
    case $choice in
        1)
            log_info "Authenticating with user account..."
            gcloud auth login
            gcloud config set project ${PROJECT_ID}
            log_success "Authenticated with user account!"
            ;;
        2)
            log_info "Authenticating with service account..."
            gcloud auth activate-service-account ${SERVICE_ACCOUNT_EMAIL} \
                --key-file="${PROJECT_ROOT}/google-service-account-key.json" \
                --project=${PROJECT_ID}
            log_success "Authenticated with service account!"
            log_warning "Note: Service accounts may have limited permissions"
            ;;
        *)
            log_error "Invalid option"
            exit 1
            ;;
    esac
fi

echo ""
log_success "✅ Authentication complete!"
echo ""
echo "Current account: $(gcloud config get-value account)"
echo "Current project: $(gcloud config get-value project)"
echo ""
echo "Next step: Run ./01-setup-gcp-project.sh"
echo ""
