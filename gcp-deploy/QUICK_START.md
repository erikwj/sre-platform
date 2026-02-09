# 🚀 Quick Start Guide

## For the Hackathon Morning (First Time Setup)

**Total Time: ~20-30 minutes**

### Step 1: Make Scripts Executable
```bash
chmod +x gcp-deploy/*.sh
```

### Step 2: Authenticate with GCP (REQUIRED FIRST)
```bash
./gcp-deploy/00-authenticate.sh
```

**Important:** Choose option 1 (User account) for best results. Service accounts have limited permissions.

### Step 3: Run All Setup Stages
```bash
# Option A: Run all stages at once
make setup

# Option B: Run stages individually (recommended for first time)
./gcp-deploy/01-setup-gcp-project.sh    # 2-3 minutes
./gcp-deploy/02-setup-database.sh       # 5-10 minutes ☕
./gcp-deploy/03-setup-secrets.sh        # 1 minute
./gcp-deploy/04-build-and-deploy.sh     # 10-15 minutes
./gcp-deploy/05-setup-custom-domain.sh  # Manual DNS config
```

### Step 4: Configure CloudFlare DNS

After stage 5, you'll get instructions. Quick version:

1. Go to [CloudFlare Dashboard](https://dash.cloudflare.com)
2. Select your domain
3. Add CNAME record:
   - **Type:** CNAME
   - **Name:** sre-platform (or your subdomain)
   - **Target:** ghs.googlehosted.com
   - **Proxy:** ✅ Enabled
4. Set SSL/TLS to "Full (strict)"
5. Wait 5-10 minutes

### Step 5: Test Your Deployment
```bash
# Check status
make status

# View logs
make logs

# Test frontend
curl https://your-domain.com
```

---

## During Hackathon (Code Changes)

When you make code changes and want to deploy:

```bash
# Quick redeploy (10-15 minutes)
make deploy
```

That's it! Your changes are live.

---

## Daily Reset (Sandbox Expires)

If your sandbox expires after 24 hours:

```bash
# Clean up old resources
make cleanup

# Start fresh next day
make setup
```

---

## Quick Commands Reference

```bash
make setup      # Full initial setup
make deploy     # Redeploy after code changes
make logs       # View service logs
make status     # Check deployment status
make cleanup    # Delete all resources
make db-info    # Show database connection info
```

---

## Troubleshooting

### "No active gcloud account"
```bash
# Run authentication helper
./gcp-deploy/00-authenticate.sh
# Choose option 1 (User account - RECOMMENDED)
```

### "Permission denied" with service account
```bash
# Switch to user account authentication
./gcp-deploy/00-authenticate.sh
# Choose option 1 (User account)
```

### "Permission denied" with user account
```bash
# Re-authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### "API not enabled"
```bash
# Re-run stage 1
./gcp-deploy/01-setup-gcp-project.sh
```

### "Build failed"
```bash
# Check logs
gcloud builds list --limit=5
gcloud builds log [BUILD_ID]
```

### "Service won't start"
```bash
# Check service logs
make logs-backend
make logs-frontend
make logs-websocket
```

---

## Important Files

After setup, these files contain important info:

- **`db-connection-info.txt`** - Database password and connection strings
- **`deployment-info.txt`** - Service URLs
- **`domain-config.txt`** - Custom domain configuration

**Don't commit these to git!** (Already in .gitignore)

---

## Cost Tracking

- **During hackathon:** ~$5-10 for 48 hours
- **After hackathon:** Cloud Run scales to zero (free when idle)
- **Database:** Pause with `gcloud sql instances patch sre-platform-db --activation-policy=NEVER`

---

## Need Help?

1. Check the full [README.md](README.md)
2. View logs: `make logs`
3. Check status: `make status`
4. View deployment info: `make info`

---

**Good luck! 🎉**
