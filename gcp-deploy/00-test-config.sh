#!/bin/bash

# Test script to verify configuration is correctly extracted
# Run this to check if config.sh reads the current google-service-account-key.json

echo "=========================================="
echo "  Testing Configuration Extraction"
echo "=========================================="
echo ""

# Load configuration
source "$(dirname "$0")/config.sh"

echo "✅ Configuration loaded successfully!"
echo ""
echo "Extracted values:"
echo "  Project ID:       ${PROJECT_ID}"
echo "  Service Account:  ${SERVICE_ACCOUNT_EMAIL}"
echo "  Region:           ${REGION}"
echo ""
echo "Database Configuration:"
echo "  Instance Name:    ${DB_INSTANCE_NAME}"
echo "  Database Name:    ${DB_NAME}"
echo "  Database User:    ${DB_USER}"
echo ""
echo "Cloud Run Services:"
echo "  Frontend:         ${FRONTEND_SERVICE}"
echo "  Backend:          ${BACKEND_SERVICE}"
echo "  WebSocket:        ${WEBSOCKET_SERVICE}"
echo ""
echo "Cloud SQL Connection:"
echo "  ${CLOUD_SQL_CONNECTION}"
echo ""

# Verify against google-service-account-key.json
echo "Verifying against google-service-account-key.json..."
EXPECTED_PROJECT=$(grep -o '"project_id"[[:space:]]*:[[:space:]]*"[^"]*"' ../google-service-account-key.json | cut -d'"' -f4)
EXPECTED_EMAIL=$(grep -o '"client_email"[[:space:]]*:[[:space:]]*"[^"]*"' ../google-service-account-key.json | cut -d'"' -f4)

if [ "$PROJECT_ID" = "$EXPECTED_PROJECT" ]; then
    echo "✅ Project ID matches: ${PROJECT_ID}"
else
    echo "❌ Project ID mismatch!"
    echo "   Expected: ${EXPECTED_PROJECT}"
    echo "   Got:      ${PROJECT_ID}"
fi

if [ "$SERVICE_ACCOUNT_EMAIL" = "$EXPECTED_EMAIL" ]; then
    echo "✅ Service Account matches: ${SERVICE_ACCOUNT_EMAIL}"
else
    echo "❌ Service Account mismatch!"
    echo "   Expected: ${EXPECTED_EMAIL}"
    echo "   Got:      ${SERVICE_ACCOUNT_EMAIL}"
fi

echo ""
echo "=========================================="
echo "  Configuration Test Complete"
echo "=========================================="
