# GCP Deployment Scripts for SRE Platform

Automated deployment scripts for deploying the SRE Platform to Google Cloud Platform.

## 📋 Prerequisites

1. **Google Cloud SDK (gcloud)** installed and configured
   ```bash
   # Install gcloud CLI
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   ```

2. **Service Account Key** - `google-service-account-key.json` in project root
   - Create a service account in GCP Console
   - Download the JSON key file
   - Place it in the project root directory

3. **Project Access** - You must have Owner or Editor role on the GCP project

## 🚀 Quick Start

### Option 1: One-Command Deployment (Recommended)

Run everything automatically with the master deployment script:

```bash
cd gcp-deploy
./deploy-all.sh
```

This script runs all deployment steps in order (00 → 01 → 02 → 03 → 04) and handles:
- Authentication
- GCP project setup
- Database creation (5-10 min wait)
- Secrets configuration
- Service builds and deployment (10-15 min)

**Total time:** ~20-30 minutes

### Option 2: Manual Step-by-Step

Run the scripts individually in order:

```bash
# Make scripts executable
chmod +x gcp-deploy/*.sh

# Stage 0: Authenticate with GCP (REQUIRED FIRST)
./gcp-deploy/00-authenticate.sh

# Stage 1: Setup GCP project and enable APIs (2-3 minutes)
./gcp-deploy/01-setup-gcp-project.sh

# Stage 2: Create Cloud SQL database (5-10 minutes)
./gcp-deploy/02-setup-database.sh

# Stage 2b: Run database migrations (2-3 minutes)
./gcp-deploy/02b-run-migrations.sh

# Stage 3: Store secrets in Secret Manager (1 minute)
./gcp-deploy/03-setup-secrets.sh

# Stage 4: Build and deploy services (10-15 minutes)
./gcp-deploy/04-build-and-deploy.sh

# Stage 5: Setup custom domain with CloudFlare (manual DNS config)
./gcp-deploy/05-setup-custom-domain.sh
```

**Total time: ~20-30 minutes**

## 📝 Detailed Steps

### Stage 0: Authentication (REQUIRED FIRST)
**Time: 1 minute**

```bash
./gcp-deploy/00-authenticate.sh
```

This script helps you authenticate properly with GCP:
- Checks if you're already authenticated
- Offers to authenticate with user account (RECOMMENDED) or service account
- Warns about service account permission limitations
- Sets the correct project

**Important:**
- **User account authentication is RECOMMENDED** for running deployment scripts
- Service accounts have limited permissions and may encounter errors
- The service account key file is used BY the deployed applications, not for deployment

**What to expect:**
- Interactive prompts to choose authentication method
- Browser window for user authentication (if chosen)
- Confirmation of active account and project

---

### Stage 1: GCP Project Setup
**Time: 2-3 minutes**

```bash
./gcp-deploy/01-setup-gcp-project.sh
```

This script:
- Sets the active GCP project
- Enables required APIs (Cloud Run, Cloud SQL, Vertex AI, etc.)
- Configures IAM roles for the service account
- Creates Artifact Registry repository

**What to expect:**
- API enablement messages
- IAM policy binding confirmations
- Success message with next steps

---

### Stage 2: Cloud SQL Database Setup
**Time: 5-10 minutes** ☕

```bash
./gcp-deploy/02-setup-database.sh
```

This script:
- Creates PostgreSQL 16 instance with pgvector extension
- Sets up database and users
- Saves connection information

**What to expect:**
- Long-running operation (5-10 minutes)
- Database password displayed (save it!)
- Connection info saved to `db-connection-info.txt`

**Important:** Save the database password shown in the output!

---

### Stage 2b: Run Database Migrations
**Time: 2-3 minutes**

```bash
./gcp-deploy/02b-run-migrations.sh
```

This script:
- Starts Cloud SQL Proxy (if not already running)
- Runs Liquibase migrations to create database schema
- Creates all tables (incidents, runbooks, postmortems, etc.)
- Enables pgvector extension for knowledge graph features

**Prerequisites:**
- Liquibase must be installed:
  ```bash
  # macOS
  brew install liquibase
  
  # Linux
  # Download from https://www.liquibase.org/download
  ```
- Cloud SQL Proxy must be installed:
  ```bash
  # macOS
  brew install cloud-sql-proxy
  
  # Linux
  curl -o cloud-sql-proxy https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64
  chmod +x cloud-sql-proxy
  ```

**What to expect:**
- Cloud SQL Proxy connection established
- Liquibase changelog execution
- Database schema creation confirmation
- Success message

**Important:** This step must be run BEFORE Stage 3 to ensure the database schema exists before deploying the application.

---

### Stage 3: Secret Manager Setup
**Time: 1 minute**

```bash
./gcp-deploy/03-setup-secrets.sh
```

This script:
- Stores database credentials in Secret Manager
- Stores ServiceNow credentials
- Grants service account access to secrets

**What to expect:**
- Quick secret creation
- IAM policy updates
- Success confirmation

---

### Stage 4: Build and Deploy Services
**Time: 10-15 minutes**

```bash
./gcp-deploy/04-build-and-deploy.sh
```

This script:
- Builds Docker images for backend, frontend, and websocket
- Pushes images to Artifact Registry
- Deploys services to Cloud Run
- Configures environment variables and secrets

**What to expect:**
- Three build processes (backend, frontend, websocket)
- Three deployment processes
- Service URLs displayed at the end
- Deployment info saved to `deployment-info.txt`

**Output:**
```
Frontend:  https://sre-frontend-xxxxx-uc.a.run.app
Backend:   https://sre-backend-xxxxx-uc.a.run.app
WebSocket: https://sre-websocket-xxxxx-uc.a.run.app
```

---

### Stage 5: Custom Domain Setup
**Time: 5-10 minutes (manual DNS configuration)**

```bash
./gcp-deploy/05-setup-custom-domain.sh
```

This script:
- Maps your custom domain to Cloud Run
- Provides CloudFlare DNS configuration instructions

**You will be prompted for:**
- Your custom domain (e.g., `sre-platform.yourdomain.com`)

**CloudFlare Configuration:**

1. Log in to [CloudFlare Dashboard](https://dash.cloudflare.com)
2. Select your domain
3. Go to **DNS > Records**
4. Add CNAME record:
   ```
   Type:    CNAME
   Name:    sre-platform (or your subdomain)
   Target:  ghs.googlehosted.com
   TTL:     Auto
   Proxy:   ✅ Enabled (orange cloud)
   ```
5. Go to **SSL/TLS > Overview**
6. Set encryption mode to: **Full (strict)**
7. Enable **Always Use HTTPS**
8. Wait 5-10 minutes for DNS propagation

**Verification:**
```bash
curl -I https://your-domain.com
```

---

## 🔄 Re-deployment (After Code Changes)

If you make code changes and want to redeploy:

```bash
# Just run stage 4 again
./gcp-deploy/04-build-and-deploy.sh
```

This rebuilds and redeploys all services with your latest code.

---

## 🧹 Cleanup (Delete All Resources)

When the hackathon is over or sandbox expires:

```bash
./gcp-deploy/99-cleanup.sh
```

This deletes:
- All Cloud Run services
- Cloud SQL database
- Secrets
- Artifact Registry repository

**Warning:** This cannot be undone!

---

## 📊 Monitoring and Logs

### View Service Logs
```bash
# Frontend logs
gcloud run services logs tail sre-frontend --region=us-central1

# Backend logs
gcloud run services logs tail sre-backend --region=us-central1

# WebSocket logs
gcloud run services logs tail sre-websocket --region=us-central1
```

### Check Service Status
```bash
gcloud run services list --region=us-central1
```

### View Database Info
```bash
gcloud sql instances describe sre-platform-db
```

### Connect to Database
```bash
# Via Cloud SQL Proxy
gcloud sql connect sre-platform-db --user=sre_user
```

---

## 🐛 Troubleshooting

### Issue: No active gcloud account
**Error:** `No active gcloud account found!`

**Solution:**
```bash
# Run the authentication helper
./gcp-deploy/00-authenticate.sh

# Or authenticate manually
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### Issue: Service account permission errors
**Error:** `Permission denied` when using service account

**Solution:**
Service accounts have limited permissions. Use a user account instead:
```bash
# Authenticate with user account
./gcp-deploy/00-authenticate.sh
# Choose option 1 (User account)
```

### Issue: API not enabled
**Error:** `API [xxx.googleapis.com] not enabled`

**Solution:**
```bash
gcloud services enable xxx.googleapis.com
```

### Issue: Permission denied
**Error:** `Permission denied` or `403 Forbidden`

**Solution:**
```bash
# Re-authenticate with user account
gcloud auth login

# Set project (use your actual project ID)
gcloud config set project YOUR_PROJECT_ID
```

### Issue: Cloud SQL connection failed
**Error:** `Could not connect to Cloud SQL`

**Solution:**
- Check that Cloud SQL instance is running
- Verify service account has `cloudsql.client` role
- Check that `--add-cloudsql-instances` is set correctly

### Issue: Build failed
**Error:** `Build failed` or `Image not found`

**Solution:**
```bash
# Check Cloud Build logs
gcloud builds list --limit=5

# View specific build
gcloud builds log [BUILD_ID]
```

### Issue: Service won't start
**Error:** `Service failed to start`

**Solution:**
```bash
# Check service logs
gcloud run services logs tail [SERVICE_NAME] --region=us-central1

# Common issues:
# - Missing environment variables
# - Database connection failed
# - Port mismatch (ensure PORT env var matches Dockerfile EXPOSE)
```

---

## 💰 Cost Optimization

### During Hackathon
- Services auto-scale based on traffic
- Estimated cost: **$5-10 for 48 hours**

### After Hackathon
```bash
# Pause database (stops billing)
gcloud sql instances patch sre-platform-db --activation-policy=NEVER

# Cloud Run automatically scales to zero (no cost when idle)
```

### Resume After Pause
```bash
# Resume database
gcloud sql instances patch sre-platform-db --activation-policy=ALWAYS
```

---

## 📁 Generated Files

The scripts create these files with important information:

- **`db-connection-info.txt`** - Database credentials and connection strings
- **`deployment-info.txt`** - Service URLs and deployment details
- **`domain-config.txt`** - Custom domain configuration

**Keep these files safe!** They contain passwords and connection information.

---

## 🎯 Hackathon Workflow

### Morning of Hackathon
```bash
# 1. Fresh deployment (20-30 minutes)
./gcp-deploy/01-setup-gcp-project.sh
./gcp-deploy/02-setup-database.sh
./gcp-deploy/02b-run-migrations.sh
./gcp-deploy/03-setup-secrets.sh
./gcp-deploy/04-build-and-deploy.sh
./gcp-deploy/05-setup-custom-domain.sh

# 2. Configure CloudFlare DNS (5 minutes)
# Follow instructions from stage 5

# 3. Verify deployment
curl https://your-domain.com
```

### During Hackathon (Code Changes)
```bash
# Work locally with Docker Compose
npm run docker:up

# When ready to deploy changes
./gcp-deploy/04-build-and-deploy.sh  # 10-15 minutes
```

### End of Day (Sandbox Expires)
```bash
# Clean up everything
./gcp-deploy/99-cleanup.sh
```

### Next Day (New Sandbox)
```bash
# Start fresh
./gcp-deploy/01-setup-gcp-project.sh
# ... repeat all stages
```

---

## 🔐 Security Notes

1. **Never commit** `db-connection-info.txt` or `deployment-info.txt` to git
2. **Database passwords** are auto-generated with timestamps
3. **Secrets** are stored in Secret Manager, not in environment variables
4. **Service account** has minimal required permissions
5. **CloudFlare proxy** provides DDoS protection and SSL

---

## 📞 Quick Reference

### Project Configuration
Configuration is automatically extracted from `google-service-account-key.json`:
- **Project ID:** Auto-detected from service account key
- **Region:** `us-central1` (configurable in config.sh)
- **Service Account:** Auto-detected from service account key

### Service Names
- **Frontend:** `sre-frontend`
- **Backend:** `sre-backend`
- **WebSocket:** `sre-websocket`
- **Database:** `sre-platform-db`

### Useful Commands
```bash
# List all Cloud Run services
gcloud run services list

# List all Cloud SQL instances
gcloud sql instances list

# List all secrets
gcloud secrets list

# View project info
gcloud config list
```

---

## 🎉 Success Checklist

After running all scripts, verify:

- [ ] All 3 Cloud Run services are deployed
- [ ] Cloud SQL database is running
- [ ] Secrets are stored in Secret Manager
- [ ] Frontend URL loads successfully
- [ ] Backend API responds (check `/api/health` or similar)
- [ ] WebSocket connects (check browser console)
- [ ] Custom domain points to frontend (if configured)
- [ ] SSL certificate is active (https://)

---

## 📚 Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [CloudFlare DNS Documentation](https://developers.cloudflare.com/dns/)

---

**Good luck with your hackathon! 🚀**
