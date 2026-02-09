#!/bin/bash

# Master Deployment Script
# Runs all deployment steps in order: 00 -> 01 -> 02 -> 03 -> 04
# This script orchestrates the complete GCP deployment process

set -e  # Exit on error

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
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

log_stage() {
    echo ""
    echo -e "${CYAN}${BOLD}=========================================="
    echo -e "  $1"
    echo -e "==========================================${NC}"
    echo ""
}

# Function to run a script and handle errors
run_script() {
    local script_name=$1
    local script_path="${SCRIPT_DIR}/${script_name}"
    
    if [ ! -f "$script_path" ]; then
        log_error "Script not found: ${script_name}"
        exit 1
    fi
    
    log_info "Running ${script_name}..."
    echo ""
    
    # Make script executable
    chmod +x "$script_path"
    
    # Run the script
    if bash "$script_path"; then
        log_success "✅ ${script_name} completed successfully!"
        echo ""
        return 0
    else
        log_error "❌ ${script_name} failed!"
        echo ""
        log_error "Deployment stopped at ${script_name}"
        echo ""
        log_info "To resume from this point, you can run:"
        echo "  cd ${SCRIPT_DIR}"
        echo "  ./${script_name}"
        echo ""
        exit 1
    fi
}

# Main deployment flow
echo ""
echo -e "${CYAN}${BOLD}╔════════════════════════════════════════╗"
echo -e "║   GCP MASTER DEPLOYMENT SCRIPT         ║"
echo -e "║   SRE Platform - Full Deployment       ║"
echo -e "╚════════════════════════════════════════╝${NC}"
echo ""

log_info "This script will run all deployment steps in order:"
echo ""
echo "  Step 0: Authentication (00-authenticate.sh)"
echo "  Step 1: GCP Project Setup (01-setup-gcp-project.sh)"
echo "  Step 2: Database Setup (02-setup-database.sh)"
echo "  Step 3: Secrets Setup (03-setup-secrets.sh)"
echo "  Step 4: Build & Deploy (04-build-and-deploy.sh)"
echo ""

log_warning "⚠️  IMPORTANT NOTES:"
echo "  • Step 0 may require interactive authentication"
echo "  • Step 2 takes 5-10 minutes (Cloud SQL creation)"
echo "  • Step 3 may ask for decryption password if ServiceNow password is encrypted"
echo "  • Step 4 builds and deploys all services (takes 10-15 minutes)"
echo ""

read -p "Press ENTER to start deployment or Ctrl+C to cancel..."
echo ""

# Track start time
START_TIME=$(date +%s)

# Step 0: Authentication
log_stage "STEP 0: Authentication"
run_script "00-authenticate.sh"

# Step 1: GCP Project Setup
log_stage "STEP 1: GCP Project Setup"
run_script "01-setup-gcp-project.sh"

# Step 2: Database Setup
log_stage "STEP 2: Database Setup"
log_warning "☕ This step takes 5-10 minutes - good time for a coffee break!"
echo ""
run_script "02-setup-database.sh"

# Step 3: Secrets Setup
log_stage "STEP 3: Secrets Setup"
log_info "Note: You may be prompted for a decryption password if ServiceNow credentials are encrypted"
echo ""
run_script "03-setup-secrets.sh"

# Step 4: Build and Deploy
log_stage "STEP 4: Build and Deploy"
log_warning "☕ This step takes 10-15 minutes - building and deploying all services"
echo ""
run_script "04-build-and-deploy.sh"

# Calculate total time
END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))
MINUTES=$((TOTAL_TIME / 60))
SECONDS=$((TOTAL_TIME % 60))

# Final success message
echo ""
echo -e "${GREEN}${BOLD}╔════════════════════════════════════════╗"
echo -e "║   🎉 DEPLOYMENT COMPLETE! 🎉           ║"
echo -e "╚════════════════════════════════════════╝${NC}"
echo ""

log_success "All deployment steps completed successfully!"
echo ""
log_info "Total deployment time: ${MINUTES}m ${SECONDS}s"
echo ""

# Show deployment info if available
if [ -f "${SCRIPT_DIR}/deployment-info.txt" ]; then
    log_info "Deployment details:"
    echo ""
    cat "${SCRIPT_DIR}/deployment-info.txt"
else
    log_info "Check deployment-info.txt for service URLs and details"
fi

echo ""
log_info "Next steps:"
echo "  • Test your application by visiting the Frontend URL"
echo "  • Run ./05-setup-custom-domain.sh to configure a custom domain"
echo "  • Check logs with: gcloud run services logs tail <service-name>"
echo ""
