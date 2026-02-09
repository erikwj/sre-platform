#!/bin/bash

# Stage 3: Setup Secret Manager
# This script stores sensitive configuration in Secret Manager

set -e  # Exit on error

# Load configuration
source "$(dirname "$0")/config.sh"

echo "=========================================="
echo "  Stage 3: Secret Manager Setup"
echo "=========================================="
echo ""

# Ensure gcloud is authenticated
log_info "Checking gcloud authentication..."
ensure_gcloud_auth
echo ""

# Load database password from connection info if it exists
if [ -f "$(dirname "$0")/db-connection-info.txt" ]; then
    DB_PASSWORD=$(grep "Password:" "$(dirname "$0")/db-connection-info.txt" | cut -d' ' -f2)
fi

# Function to decrypt encrypted values (format: enc:iv:encrypted)
decrypt_value() {
    local encrypted_value=$1
    local password=$2
    
    # Check if value is encrypted (starts with "enc:")
    if [[ ! "$encrypted_value" =~ ^enc: ]]; then
        echo "$encrypted_value"
        return
    fi
    
    # Use Node.js to decrypt
    node -e "
const crypto = require('crypto');

function decrypt(encryptedValue, password) {
  const parts = encryptedValue.split(':');
  if (parts.length !== 3 || parts[0] !== 'enc') {
    throw new Error('Invalid encrypted value format');
  }
  
  const iv = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(password, 'salt', 32);
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

try {
  const decrypted = decrypt('$encrypted_value', '$password');
  process.stdout.write(decrypted);
} catch (error) {
  console.error('Decryption failed:', error.message);
  process.exit(1);
}
"
}

# Check if ServiceNow password is encrypted
if [[ "$SERVICENOW_PASSWORD" =~ ^enc: ]]; then
    log_warning "🔐 Encrypted ServiceNow password detected"
    echo ""
    
    # Prompt for decryption password
    read -sp "Enter decryption password: " DECRYPTION_PASSWORD
    echo ""
    echo ""
    
    # Decrypt the password
    log_info "Decrypting ServiceNow password..."
    DECRYPTED_SNOW_PASSWORD=$(decrypt_value "$SERVICENOW_PASSWORD" "$DECRYPTION_PASSWORD")
    
    if [ $? -eq 0 ] && [ -n "$DECRYPTED_SNOW_PASSWORD" ]; then
        SERVICENOW_PASSWORD="$DECRYPTED_SNOW_PASSWORD"
        log_success "✅ ServiceNow password decrypted successfully"
    else
        log_error "❌ Failed to decrypt ServiceNow password"
        exit 1
    fi
    echo ""
fi

log_info "Creating secrets in Secret Manager..."
echo ""

# Function to create or update secret
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    
    log_info "Processing secret: ${secret_name}"
    
    # Check if secret exists
    if gcloud secrets describe ${secret_name} --project=${PROJECT_ID} &>/dev/null; then
        log_warning "Secret ${secret_name} already exists, creating new version..."
        echo -n "${secret_value}" | gcloud secrets versions add ${secret_name} \
            --data-file=- \
            --project=${PROJECT_ID}
    else
        log_info "Creating new secret: ${secret_name}..."
        echo -n "${secret_value}" | gcloud secrets create ${secret_name} \
            --data-file=- \
            --replication-policy="automatic" \
            --project=${PROJECT_ID}
    fi
    
    # Grant access to service account
    gcloud secrets add-iam-policy-binding ${secret_name} \
        --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
        --role="roles/secretmanager.secretAccessor" \
        --project=${PROJECT_ID} \
        --quiet 2>/dev/null || true
    
    log_success "Secret ${secret_name} ready!"
}

# Build the DATABASE_URL connection string for Cloud Run
# Format: postgresql://user:password@/database?host=/cloudsql/connection-name
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${CLOUD_SQL_CONNECTION}"

log_info "DATABASE_URL format: postgresql://USER:PASSWORD@/DATABASE?host=/cloudsql/CONNECTION"
echo ""

# Create secrets
create_or_update_secret "db-password" "${DATABASE_URL}"
create_or_update_secret "db-user" "${DB_USER}"
create_or_update_secret "db-name" "${DB_NAME}"
create_or_update_secret "servicenow-password" "${SERVICENOW_PASSWORD}"
create_or_update_secret "servicenow-username" "${SERVICENOW_USERNAME}"
create_or_update_secret "servicenow-instance-url" "${SERVICENOW_INSTANCE_URL}"

echo ""
log_success "✅ Stage 3 Complete!"
echo ""
echo "All secrets stored securely in Secret Manager!"
echo ""
echo "Next step: Run ./04-build-and-deploy.sh"
echo ""
