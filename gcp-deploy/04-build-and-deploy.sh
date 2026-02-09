#!/bin/bash

# Stage 4: Build and Deploy to Cloud Run
# This script builds Docker images and deploys services to Cloud Run
# Usage: ./04-build-and-deploy.sh [--skip-backend] [--skip-frontend] [--skip-websocket]

set -e  # Exit on error

# Load configuration
source "$(dirname "$0")/config.sh"

# Parse command line arguments
SKIP_BACKEND=false
SKIP_FRONTEND=false
SKIP_WEBSOCKET=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-backend)
            SKIP_BACKEND=true
            shift
            ;;
        --skip-frontend)
            SKIP_FRONTEND=true
            shift
            ;;
        --skip-websocket)
            SKIP_WEBSOCKET=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--skip-backend] [--skip-frontend] [--skip-websocket]"
            exit 1
            ;;
    esac
done

echo "=========================================="
echo "  Stage 4: Build and Deploy Services"
echo "=========================================="
echo ""

# Ensure gcloud is authenticated
log_info "Checking gcloud authentication..."
ensure_gcloud_auth
echo ""

# Load database connection info
if [ -f "$(dirname "$0")/db-connection-info.txt" ]; then
    DB_PASSWORD=$(grep "Password:" "$(dirname "$0")/db-connection-info.txt" | cut -d' ' -f2)
fi

# Navigate to project root
cd "$(dirname "$0")/.."

log_info "Building and deploying services..."
echo ""

# Build and push backend
if [ "$SKIP_BACKEND" = false ]; then
    log_info "📦 Building Backend service..."
    gcloud builds submit ./backend \
        --tag="${REGION}-docker.pkg.dev/${PROJECT_ID}/sre-platform/backend:latest" \
        --project=${PROJECT_ID}
    
    log_success "Backend image built and pushed!"
    echo ""
else
    log_info "⏭️  Skipping Backend build (using existing image)"
    echo ""
fi

# Build and push websocket
if [ "$SKIP_WEBSOCKET" = false ]; then
    log_info "📦 Building WebSocket service..."
    gcloud builds submit . \
        --config="gcp-deploy/cloudbuild-websocket.yaml" \
        --substitutions=_IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/sre-platform/websocket:latest" \
        --project=${PROJECT_ID}
    
    log_success "WebSocket image built and pushed!"
    echo ""
else
    log_info "⏭️  Skipping WebSocket build (using existing image)"
    echo ""
fi

# Deploy Backend
log_info "🚀 Deploying Backend to Cloud Run..."
gcloud run deploy ${BACKEND_SERVICE} \
    --image="${REGION}-docker.pkg.dev/${PROJECT_ID}/sre-platform/backend:latest" \
    --platform=managed \
    --region=${REGION} \
    --allow-unauthenticated \
    --service-account=${SERVICE_ACCOUNT_EMAIL} \
    --add-cloudsql-instances=${CLOUD_SQL_CONNECTION} \
    --set-env-vars="NODE_ENV=production,GOOGLE_CLOUD_LOCATION=${REGION}" \
    --set-secrets="DATABASE_URL=db-password:latest,SERVICENOW_PASSWORD=servicenow-password:latest,SERVICENOW_USERNAME=servicenow-username:latest,SERVICENOW_INSTANCE_URL=servicenow-instance-url:latest,GOOGLE_SERVICE_ACCOUNT_KEY=google-service-account-key:latest" \
    --memory=512Mi \
    --cpu=1 \
    --timeout=300 \
    --max-instances=10 \
    --project=${PROJECT_ID}

BACKEND_URL=$(gcloud run services describe ${BACKEND_SERVICE} \
    --platform=managed \
    --region=${REGION} \
    --project=${PROJECT_ID} \
    --format="value(status.url)")

log_success "Backend deployed at: ${BACKEND_URL}"
echo ""

# Deploy WebSocket
log_info "🚀 Deploying WebSocket to Cloud Run..."
gcloud run deploy ${WEBSOCKET_SERVICE} \
    --image="${REGION}-docker.pkg.dev/${PROJECT_ID}/sre-platform/websocket:latest" \
    --platform=managed \
    --region=${REGION} \
    --allow-unauthenticated \
    --service-account=${SERVICE_ACCOUNT_EMAIL} \
    --add-cloudsql-instances=${CLOUD_SQL_CONNECTION} \
    --set-env-vars="NODE_ENV=production" \
    --set-secrets="DATABASE_URL=db-password:latest" \
    --memory=256Mi \
    --cpu=1 \
    --timeout=3600 \
    --max-instances=5 \
    --project=${PROJECT_ID}

WEBSOCKET_URL=$(gcloud run services describe ${WEBSOCKET_SERVICE} \
    --platform=managed \
    --region=${REGION} \
    --project=${PROJECT_ID} \
    --format="value(status.url)")

log_success "WebSocket deployed at: ${WEBSOCKET_URL}"
echo ""

# Build and push frontend (AFTER backend is deployed so we have the URL)
if [ "$SKIP_FRONTEND" = false ]; then
    log_info "📦 Building Frontend service with API URLs..."
    log_info "Backend URL: ${BACKEND_URL}"
    log_info "WebSocket URL: ${WEBSOCKET_URL}"
    
    gcloud builds submit . \
        --config="gcp-deploy/cloudbuild-frontend.yaml" \
        --substitutions="_IMAGE_NAME=${REGION}-docker.pkg.dev/${PROJECT_ID}/sre-platform/frontend:latest,_API_URL=${BACKEND_URL},_NEXT_PUBLIC_API_URL=${BACKEND_URL},_NEXT_PUBLIC_WEBSOCKET_URL=${WEBSOCKET_URL}" \
        --project=${PROJECT_ID}
    
    log_success "Frontend image built and pushed!"
    echo ""
else
    log_info "⏭️  Skipping Frontend build (using existing image)"
    echo ""
fi

# Deploy Frontend
log_info "🚀 Deploying Frontend to Cloud Run..."
gcloud run deploy ${FRONTEND_SERVICE} \
    --image="${REGION}-docker.pkg.dev/${PROJECT_ID}/sre-platform/frontend:latest" \
    --platform=managed \
    --region=${REGION} \
    --allow-unauthenticated \
    --service-account=${SERVICE_ACCOUNT_EMAIL} \
    --set-env-vars="API_URL=${BACKEND_URL},NEXT_PUBLIC_API_URL=${BACKEND_URL},NEXT_PUBLIC_WEBSOCKET_URL=${WEBSOCKET_URL}" \
    --memory=512Mi \
    --cpu=1 \
    --timeout=300 \
    --max-instances=10 \
    --project=${PROJECT_ID}

FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE} \
    --platform=managed \
    --region=${REGION} \
    --project=${PROJECT_ID} \
    --format="value(status.url)")

log_success "Frontend deployed at: ${FRONTEND_URL}"
echo ""

# Save deployment info
cat > "$(dirname "$0")/deployment-info.txt" <<EOF
Deployment Information
======================
Deployed at: $(date)

Service URLs:
-------------
Frontend:  ${FRONTEND_URL}
Backend:   ${BACKEND_URL}
WebSocket: ${WEBSOCKET_URL}

Cloud Run Services:
-------------------
Frontend:  ${FRONTEND_SERVICE}
Backend:   ${BACKEND_SERVICE}
WebSocket: ${WEBSOCKET_SERVICE}

Database:
---------
Instance:  ${DB_INSTANCE_NAME}
Connection: ${CLOUD_SQL_CONNECTION}

To view logs:
-------------
gcloud run services logs tail ${FRONTEND_SERVICE} --region=${REGION} --project=${PROJECT_ID}
gcloud run services logs tail ${BACKEND_SERVICE} --region=${REGION} --project=${PROJECT_ID}
gcloud run services logs tail ${WEBSOCKET_SERVICE} --region=${REGION} --project=${PROJECT_ID}

To update services:
-------------------
./04-build-and-deploy.sh
EOF

log_success "Deployment info saved to deployment-info.txt"
echo ""

log_success "✅ Stage 4 Complete!"
echo ""
echo "=========================================="
echo "  🎉 DEPLOYMENT SUCCESSFUL!"
echo "=========================================="
echo ""
echo "Your application is live at:"
echo ""
echo "  🌐 Frontend:  ${FRONTEND_URL}"
echo "  🔧 Backend:   ${BACKEND_URL}"
echo "  📡 WebSocket: ${WEBSOCKET_URL}"
echo ""
echo "Next step: Run ./05-setup-custom-domain.sh to configure CloudFlare"
echo ""
