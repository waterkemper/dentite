# 🚀 Dentite Deployment Guide

This guide covers deploying Dentite to production environments.

---

## Pre-Deployment Checklist

### Security
- [ ] Change all default passwords and secrets
- [ ] Generate strong JWT_SECRET
- [ ] Configure HTTPS/SSL certificates
- [ ] Set up firewall rules
- [ ] Enable database encryption at rest
- [ ] Configure CORS for production domain
- [ ] Set secure cookie flags
- [ ] Review and audit all API endpoints

### Environment Variables
- [ ] Set NODE_ENV=production
- [ ] Configure production DATABASE_URL
- [ ] Add real Twilio credentials
- [ ] Add real SendGrid credentials
- [ ] Add OpenDental API credentials
- [ ] Set production API URLs

### Database
- [ ] Run all migrations on production database
- [ ] Set up automated backups
- [ ] Configure connection pooling
- [ ] Enable query logging (with caution)
- [ ] Set up monitoring and alerts

### Performance
- [ ] Enable compression
- [ ] Configure CDN for static assets
- [ ] Set up caching headers
- [ ] Enable Gzip compression
- [ ] Optimize bundle sizes

---

## Deployment Options

### Option 1: Docker (Recommended)

#### Requirements
- Docker-compatible hosting (AWS ECS, Google Cloud Run, Railway, Render)
- PostgreSQL database (AWS RDS, Railway, Supabase)
- Redis instance (optional, for future scaling)

#### Step 1: Build Docker Images

**Backend:**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**Frontend:**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Step 2: Deploy with Docker Compose

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: dentite_prod
      POSTGRES_USER: dentite_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    environment:
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
    depends_on:
      - postgres
    ports:
      - "3000:3000"

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

---

### Option 2: Platform-as-a-Service (Easiest)

#### Railway.app

1. **Create Railway Account**
   - Visit https://railway.app
   - Connect GitHub repository

2. **Add Services**
   - Add PostgreSQL plugin
   - Deploy backend from GitHub
   - Deploy frontend from GitHub

3. **Configure Environment**
   - Set environment variables in Railway dashboard
   - Railway automatically provides DATABASE_URL

4. **Deploy**
   ```bash
   # Railway CLI
   railway login
   railway link
   railway up
   ```

#### Render.com

1. **Create Services**
   - New PostgreSQL instance
   - New Web Service (backend)
   - New Static Site (frontend)

2. **Configure Backend**
   - Build command: `cd backend && npm install && npx prisma generate && npm run build`
   - Start command: `cd backend && npm start`
   - Add environment variables

3. **Configure Frontend**
   - Build command: `cd frontend && npm install && npm run build`
   - Publish directory: `frontend/dist`

---

### Option 3: AWS (Production Scale)

#### Architecture
```
Internet Gateway
      │
      ▼
Application Load Balancer
      │
      ├─► ECS/Fargate (Backend) ─► RDS PostgreSQL
      │
      └─► CloudFront + S3 (Frontend)
```

#### Step 1: Database (RDS)
```bash
# Create PostgreSQL RDS instance
aws rds create-db-instance \
  --db-instance-identifier dentite-prod-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username dentite_admin \
  --master-user-password ${DB_PASSWORD} \
  --allocated-storage 20
```

#### Step 2: Backend (ECS)
```bash
# Build and push Docker image to ECR
aws ecr create-repository --repository-name dentite-backend
docker build -t dentite-backend ./backend
docker tag dentite-backend:latest ${ECR_URI}/dentite-backend:latest
docker push ${ECR_URI}/dentite-backend:latest

# Create ECS service
aws ecs create-service \
  --cluster dentite-prod \
  --service-name dentite-backend \
  --task-definition dentite-backend-task \
  --desired-count 2 \
  --launch-type FARGATE
```

#### Step 3: Frontend (S3 + CloudFront)
```bash
# Build frontend
cd frontend
npm run build

# Create S3 bucket
aws s3 mb s3://dentite-frontend-prod

# Upload build
aws s3 sync dist/ s3://dentite-frontend-prod --delete

# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name dentite-frontend-prod.s3.amazonaws.com
```

---

## Database Migrations

### Production Migration Strategy

**Never run migrations directly in production!**

#### Safe Migration Process

1. **Test Migrations Locally**
```bash
# Create migration
npx prisma migrate dev --name add_new_feature

# Test thoroughly
npm test
```

2. **Deploy to Staging**
```bash
DATABASE_URL=<staging-db> npx prisma migrate deploy
```

3. **Backup Production Database**
```bash
pg_dump -h <prod-host> -U <user> -d dentite_prod > backup_$(date +%Y%m%d).sql
```

4. **Deploy to Production**
```bash
# Use migrate deploy (never migrate dev in production!)
DATABASE_URL=<prod-db> npx prisma migrate deploy
```

5. **Verify**
```bash
# Check migration status
npx prisma migrate status
```

---

## Environment Configuration

### Backend Production .env

```bash
# Server
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@prod-db.amazonaws.com:5432/dentite_prod

# Security
JWT_SECRET=<generate-with-openssl-rand-base64-32>
JWT_EXPIRES_IN=7d

# OpenDental
OPENDENTAL_API_URL=https://api.opendental.com/v1
OPENDENTAL_API_KEY=<your-api-key>
OPENDENTAL_CLIENT_ID=<your-client-id>
OPENDENTAL_CLIENT_SECRET=<your-client-secret>

# Twilio
TWILIO_ACCOUNT_SID=<your-account-sid>
TWILIO_AUTH_TOKEN=<your-auth-token>
TWILIO_PHONE_NUMBER=+1234567890

# SendGrid
SENDGRID_API_KEY=<your-api-key>
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Dentite

# Monitoring (optional)
SENTRY_DSN=<your-sentry-dsn>
```

### Frontend Production .env

```bash
VITE_API_URL=https://api.yourdomain.com
```

---

## SSL/HTTPS Setup

### Using Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        root /var/www/dentite/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Monitoring & Logging

### Application Monitoring

**Recommended Tools:**
- **Sentry** - Error tracking
- **DataDog** - APM and infrastructure
- **New Relic** - Performance monitoring
- **LogRocket** - Frontend monitoring

**Setup Sentry:**
```bash
npm install @sentry/node @sentry/tracing

# In backend/src/index.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Database Monitoring

```bash
# Enable slow query log (PostgreSQL)
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

# Monitor connections
SELECT count(*) FROM pg_stat_activity;
```

### Uptime Monitoring

- **UptimeRobot** - Free tier available
- **Pingdom** - Comprehensive monitoring
- **Better Uptime** - Status pages included

---

## Backup Strategy

### Database Backups

**Automated Daily Backups:**
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/dentite"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="dentite_backup_$DATE.sql"

# Create backup
pg_dump -h $DB_HOST -U $DB_USER -d dentite_prod > "$BACKUP_DIR/$FILENAME"

# Compress
gzip "$BACKUP_DIR/$FILENAME"

# Upload to S3
aws s3 cp "$BACKUP_DIR/$FILENAME.gz" s3://dentite-backups/

# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

**Add to crontab:**
```bash
0 3 * * * /usr/local/bin/backup.sh
```

---

## Scaling Considerations

### Horizontal Scaling

**Backend:**
- Run multiple instances behind load balancer
- Use stateless design (no in-memory sessions)
- Share session state via Redis

**Database:**
- Set up read replicas for analytics queries
- Use connection pooling
- Consider managed services (RDS, Cloud SQL)

### Caching Strategy

```bash
# Redis for caching
npm install redis

# Cache frequently accessed data
- Patient lists
- Dashboard metrics
- Campaign configurations
```

### Queue System

```bash
# Bull for background jobs
npm install bull

# Queue jobs:
- Email sending
- SMS sending
- Data synchronization
- Report generation
```

---

## Rollback Procedure

### If Deployment Fails

1. **Database Rollback**
```bash
# Restore from backup
psql -h <host> -U <user> -d dentite_prod < backup.sql
```

2. **Application Rollback**
```bash
# Docker
docker-compose down
docker-compose up -d <previous-image-tag>

# Railway/Render
# Use dashboard to rollback to previous deployment
```

3. **DNS Rollback**
```bash
# Update DNS to point to previous version
# Wait for TTL propagation
```

---

## Performance Optimization

### Backend

```typescript
// Enable compression
import compression from 'compression';
app.use(compression());

// Rate limiting
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Connection pooling (Prisma does this automatically)
```

### Frontend

```bash
# Code splitting
# Implemented automatically by Vite

# Image optimization
npm install sharp

# Lazy loading
const Analytics = lazy(() => import('./pages/Analytics'));
```

---

## Cost Estimation

### Small Practice (< 1000 patients)

- **Hosting (Railway/Render):** $15-25/month
- **Database (Managed):** $15-20/month
- **Twilio SMS:** $0.0079/message (~$50/month)
- **SendGrid Email:** Free tier (12k/month)
- **Total:** ~$80-95/month

### Medium Practice (1000-5000 patients)

- **AWS ECS:** $30-50/month
- **AWS RDS:** $50-75/month
- **SMS/Email:** $100-150/month
- **CloudFront:** $10-20/month
- **Total:** ~$190-295/month

---

## Support & Maintenance

### Regular Maintenance Tasks

**Weekly:**
- [ ] Review error logs
- [ ] Check uptime metrics
- [ ] Monitor disk space

**Monthly:**
- [ ] Update dependencies
- [ ] Review security advisories
- [ ] Analyze performance metrics
- [ ] Test backup restoration

**Quarterly:**
- [ ] Security audit
- [ ] Performance optimization
- [ ] User feedback review
- [ ] Feature planning

---

## Troubleshooting

### Common Issues

**Backend won't start:**
```bash
# Check logs
docker-compose logs backend

# Verify database connection
psql $DATABASE_URL

# Check environment variables
printenv | grep DATABASE_URL
```

**High database CPU:**
```sql
-- Find slow queries
SELECT query, calls, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

**Memory leaks:**
```bash
# Monitor Node.js memory
node --max-old-space-size=4096 dist/index.js

# Use clinic.js for profiling
npm install -g clinic
clinic doctor -- node dist/index.js
```

---

**For additional support, contact support@dentite.com**

