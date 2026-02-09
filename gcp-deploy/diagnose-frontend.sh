#!/bin/bash

# Diagnostic script to verify frontend deployment issues
# This script checks the current deployment configuration and identifies problems

set -e

# Load configuration
source "$(dirname "$0")/config.sh"

echo "=========================================="
echo "  Frontend Deployment Diagnostics"
echo "=========================================="
echo ""

log_info "Checking current frontend deployment configuration..."
echo ""

# Check if service exists
if gcloud run services describe ${FRONTEND_SERVICE} \
    --platform=managed \
    --region=${REGION} \
    --project=${PROJECT_ID} &>/dev/null; then
    
    log_success "Frontend service exists: ${FRONTEND_SERVICE}"
    echo ""
    
    # Get current configuration
    log_info "Current Environment Variables:"
    gcloud run services describe ${FRONTEND_SERVICE} \
        --platform=managed \
        --region=${REGION} \
        --project=${PROJECT_ID} \
        --format="table(spec.template.spec.containers[0].env[].name, spec.template.spec.containers[0].env[].value)"
    echo ""
    
    log_info "Current Resource Limits:"
    gcloud run services describe ${FRONTEND_SERVICE} \
        --platform=managed \
        --region=${REGION} \
        --project=${PROJECT_ID} \
        --format="table(spec.template.spec.containers[0].resources.limits.memory, spec.template.spec.containers[0].resources.limits.cpu)"
    echo ""
    
    log_info "Current Image:"
    gcloud run services describe ${FRONTEND_SERVICE} \
        --platform=managed \
        --region=${REGION} \
        --project=${PROJECT_ID} \
        --format="value(spec.template.spec.containers[0].image)"
    echo ""
    
else
    log_error "Frontend service not found: ${FRONTEND_SERVICE}"
    exit 1
fi

# Check recent logs for errors
log_info "Recent error logs (last 50 lines):"
gcloud run services logs read ${FRONTEND_SERVICE} \
    --region=${REGION} \
    --project=${PROJECT_ID} \
    --limit=50 \
    --format="table(timestamp, severity, textPayload)" \
    | grep -E "(ERROR|Module parse failed|Memory limit)" || echo "No recent errors found"
echo ""

# Analyze issues
log_info "🔍 ISSUE ANALYSIS:"
echo ""
echo "1. ❌ DOCKERFILE ISSUE:"
echo "   - Current: Uses 'npm run dev' (development mode)"
echo "   - Problem: Dev mode compiles on-demand, high memory usage"
echo "   - Expected: Should use 'npm run build' + 'npm run start'"
echo ""

echo "2. ❌ TAILWIND CSS ISSUE:"
echo "   - Current: tailwindcss, postcss, autoprefixer in devDependencies"
echo "   - Problem: Not available in production, causes parse errors"
echo "   - Expected: Move to dependencies OR use production build"
echo ""

echo "3. ❌ MEMORY ISSUE:"
echo "   - Current: 512 MiB"
echo "   - Problem: Insufficient for dev mode + compilation"
echo "   - Expected: 1024 MiB for dev mode OR 512 MiB for production build"
echo ""

echo "4. ❌ PORT CONFIGURATION:"
echo "   - Dockerfile exposes: 3000"
echo "   - Cloud Run expects: 8080"
echo "   - Next.js dev starts on: 8080 (from logs)"
echo "   - Status: Working but inconsistent"
echo ""

echo "5. ❌ NODE_ENV CONFLICT:"
echo "   - Deployment sets: NODE_ENV=production"
echo "   - But runs: npm run dev (development mode)"
echo "   - Problem: Creates inconsistencies"
echo ""

log_info "📋 RECOMMENDED FIXES:"
echo ""
echo "Option A (Recommended): Production Build"
echo "  1. Update Dockerfile to use multi-stage build"
echo "  2. Run 'npm run build' during build phase"
echo "  3. Run 'npm run start' in production"
echo "  4. Keep memory at 512 MiB"
echo ""
echo "Option B (Quick Fix): Fix Dev Mode"
echo "  1. Move Tailwind dependencies to 'dependencies'"
echo "  2. Increase memory to 1024 MiB"
echo "  3. Keep using dev mode (not recommended for production)"
echo ""

log_info "To apply fixes, run: ./04-build-and-deploy.sh --skip-backend --skip-websocket"
echo ""
