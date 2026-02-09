#!/bin/bash

# Stage 5: Setup Custom Domain with CloudFlare
# This script provides instructions for CloudFlare DNS configuration

set -e  # Exit on error

# Load configuration
source "$(dirname "$0")/config.sh"

echo "=========================================="
echo "  Stage 5: Custom Domain Setup"
echo "=========================================="
echo ""

# Get frontend URL
FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE} \
    --platform=managed \
    --region=${REGION} \
    --project=${PROJECT_ID} \
    --format="value(status.url)" 2>/dev/null || echo "Not deployed yet")

if [ "$FRONTEND_URL" = "Not deployed yet" ]; then
    log_error "Frontend service not deployed yet. Run ./04-build-and-deploy.sh first"
    exit 1
fi

log_info "Frontend URL: ${FRONTEND_URL}"
echo ""

# Ask for custom domain
read -p "Enter your custom domain (e.g., sre-platform.yourdomain.com): " CUSTOM_DOMAIN

if [ -z "$CUSTOM_DOMAIN" ]; then
    log_error "Domain cannot be empty"
    exit 1
fi

log_info "Setting up custom domain: ${CUSTOM_DOMAIN}"
echo ""

# Map domain to Cloud Run service
log_info "Mapping domain to Cloud Run service..."
gcloud run domain-mappings create \
    --service=${FRONTEND_SERVICE} \
    --domain=${CUSTOM_DOMAIN} \
    --region=${REGION} \
    --project=${PROJECT_ID} 2>/dev/null || log_warning "Domain mapping may already exist"

# Get the DNS records needed
log_info "Fetching DNS configuration..."
DOMAIN_MAPPING=$(gcloud run domain-mappings describe ${CUSTOM_DOMAIN} \
    --region=${REGION} \
    --project=${PROJECT_ID} \
    --format=json 2>/dev/null || echo "{}")

echo ""
log_success "Domain mapping created!"
echo ""

# Display CloudFlare configuration instructions
cat <<EOF
========================================
  CloudFlare DNS Configuration
========================================

To point your CloudFlare domain to Cloud Run, follow these steps:

1. Log in to CloudFlare Dashboard (https://dash.cloudflare.com)

2. Select your domain

3. Go to DNS > Records

4. Add the following DNS record:

   Type:    CNAME
   Name:    ${CUSTOM_DOMAIN%%.*} (or @ for root domain)
   Target:  ghs.googlehosted.com
   TTL:     Auto
   Proxy:   ✅ Enabled (orange cloud)

5. If using a subdomain (e.g., sre.yourdomain.com):
   
   Type:    CNAME
   Name:    sre (the subdomain part)
   Target:  ghs.googlehosted.com
   TTL:     Auto
   Proxy:   ✅ Enabled

6. Wait 5-10 minutes for DNS propagation

7. Verify the domain mapping:
   
   gcloud run domain-mappings describe ${CUSTOM_DOMAIN} \\
     --region=${REGION} \\
     --project=${PROJECT_ID}

8. Test your domain:
   
   curl https://${CUSTOM_DOMAIN}

========================================
  SSL/TLS Configuration (CloudFlare)
========================================

1. In CloudFlare, go to SSL/TLS > Overview

2. Set SSL/TLS encryption mode to: "Full (strict)"

3. Enable "Always Use HTTPS" in SSL/TLS > Edge Certificates

4. Enable "Automatic HTTPS Rewrites"

========================================
  Additional CloudFlare Settings
========================================

For better performance during the hackathon:

1. Speed > Optimization
   - Enable "Auto Minify" (JS, CSS, HTML)
   - Enable "Brotli" compression

2. Caching > Configuration
   - Set "Browser Cache TTL" to 4 hours

3. Firewall > Settings
   - Set "Security Level" to Medium

========================================

Your application will be accessible at:

  🌐 https://${CUSTOM_DOMAIN}

Backend API will remain at:
  🔧 ${FRONTEND_URL/frontend/backend}

WebSocket will remain at:
  📡 ${FRONTEND_URL/frontend/websocket}

========================================
EOF

# Save domain configuration
cat > "$(dirname "$0")/domain-config.txt" <<EOF
Domain Configuration
====================
Custom Domain: ${CUSTOM_DOMAIN}
Frontend URL:  ${FRONTEND_URL}
Backend URL:   ${FRONTEND_URL/frontend/backend}
WebSocket URL: ${FRONTEND_URL/frontend/websocket}

CloudFlare DNS Record:
Type:   CNAME
Name:   ${CUSTOM_DOMAIN%%.*}
Target: ghs.googlehosted.com
Proxy:  Enabled

Verification Command:
gcloud run domain-mappings describe ${CUSTOM_DOMAIN} --region=${REGION} --project=${PROJECT_ID}

Test Command:
curl -I https://${CUSTOM_DOMAIN}
EOF

log_success "Domain configuration saved to domain-config.txt"
echo ""

log_success "✅ Stage 5 Complete!"
echo ""
echo "After configuring CloudFlare DNS, your app will be live at:"
echo "  🌐 https://${CUSTOM_DOMAIN}"
echo ""
