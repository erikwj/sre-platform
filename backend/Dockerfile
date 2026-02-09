FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Note: google-service-account-key.json will be mounted as a volume in docker-compose
# In GCP, it will be provided via GOOGLE_SERVICE_ACCOUNT_KEY environment variable from Secret Manager

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "run", "dev"]
