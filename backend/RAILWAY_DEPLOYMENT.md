# Railway Deployment Guide - ARS Backend

**Last Updated:** 2026-02-11  
**Status:** ✅ Ready for Production

---

## Quick Start

### 1. Prerequisites

- Railway account: https://railway.app
- GitHub repository connected to Railway
- Environment variables ready (see below)

### 2. Deploy to Railway

**Option A: Using Railway CLI**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

**Option B: Using Railway Dashboard**
1. Go to https://railway.app/new
2. Select "Deploy from GitHub repo"
3. Choose your repository
4. Railway will auto-detect the Dockerfile

---

## Configuration

### Railway Settings

**Build Configuration:**
```yaml
Builder: DOCKERFILE
Dockerfile Path: backend/Dockerfile.railway
Build Context: backend/
```

**Deploy Configuration:**
```yaml
Start Command: node dist/index.js
Restart Policy: ON_FAILURE
Max Retries: 10
Health Check Path: /health
Health Check Interval: 30s
Health Check Timeout: 10s
```

**Resources:**
```yaml
Memory: 512MB (minimum)
CPU: 0.5 vCPU (minimum)
```

---

## Environment Variables

### Required Variables

Copy these to Railway dashboard (Settings → Variables):

```env
# Node Environment
NODE_ENV=production
PORT=4000

# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta

# Database (Supabase)
DATABASE_URL=postgresql://user:pass@host:5432/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Redis (Upstash)
REDIS_URL=redis://default:password@host:port
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# API Keys (Optional)
HELIUS_API_KEY=your-helius-key
JUPITER_API_KEY=your-jupiter-key
```

### Optional Variables

```env
# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Caching
CACHE_TTL_SECONDS=300

# Logging
LOG_LEVEL=info

# Privacy Features (if enabled)
PRIVACY_ENABLED=false
SIPHER_PROTOCOL_URL=https://sipher.example.com
```

---

## Deployment Steps

### Step 1: Prepare Repository

```bash
# Ensure all files are committed
git add backend/Dockerfile.railway backend/.dockerignore
git commit -m "Add optimized Railway Dockerfile"
git push origin main
```

### Step 2: Create Railway Project

1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select your repository
4. Railway will detect the Dockerfile automatically

### Step 3: Configure Environment

1. Go to project → Settings → Variables
2. Add all required environment variables (see above)
3. Click "Deploy" to trigger build

### Step 4: Monitor Deployment

1. Watch build logs in Railway dashboard
2. Wait for health check to pass (green status)
3. Check deployment URL: `https://your-app.railway.app`

### Step 5: Verify Deployment

```bash
# Test health endpoint
curl https://your-app.railway.app/health

# Expected response:
# {"status":"ok","timestamp":"2026-02-11T..."}

# Test API endpoint
curl https://your-app.railway.app/api/v1/ili/current

# Expected response:
# {"ili":11.54,"timestamp":"...","components":{...}}
```

---

## Troubleshooting

### Build Fails

**Error:** `npm ci` fails
```bash
# Solution: Check package-lock.json is committed
git add package-lock.json
git commit -m "Add package-lock.json"
git push
```

**Error:** TypeScript compilation errors
```bash
# Solution: Build locally first
cd backend
npm run build

# If successful, commit and push
git add .
git commit -m "Fix TypeScript errors"
git push
```

### Health Check Fails

**Error:** Container starts but health check fails

1. Check logs in Railway dashboard
2. Verify environment variables are set
3. Check database connection:
   ```bash
   railway logs
   # Look for "Database connected" or connection errors
   ```

### Container Crashes

**Error:** Container exits immediately

1. Check logs for errors:
   ```bash
   railway logs --tail 100
   ```

2. Common issues:
   - Missing `DATABASE_URL`
   - Invalid Solana RPC URL
   - Port already in use (should be 4000)

### High Memory Usage

**Error:** Container uses >400MB memory

1. Check for memory leaks in logs
2. Increase memory limit in Railway:
   - Settings → Resources → Memory: 1GB

---

## Monitoring

### Health Checks

Railway automatically monitors `/health` endpoint:
- Interval: 30 seconds
- Timeout: 10 seconds
- Retries: 3

If health check fails 3 times, Railway will restart the container.

### Logs

View logs in Railway dashboard or CLI:
```bash
# Real-time logs
railway logs

# Last 100 lines
railway logs --tail 100

# Filter by level
railway logs | grep ERROR
```

### Metrics

Monitor in Railway dashboard:
- CPU usage (target: <50%)
- Memory usage (target: <400MB)
- Response time (target: <500ms)
- Error rate (target: <0.1%)

---

## Scaling

### Horizontal Scaling

Railway supports multiple instances:

1. Go to Settings → Scaling
2. Set replicas: 2-5 instances
3. Railway will load balance automatically

**Note:** Ensure your app is stateless (uses Redis for sessions)

### Vertical Scaling

Increase resources per instance:

1. Go to Settings → Resources
2. Adjust:
   - Memory: 512MB → 1GB → 2GB
   - CPU: 0.5 → 1.0 → 2.0 vCPU

---

## Cost Optimization

### Railway Pricing

- **Hobby Plan:** $5/month (500 hours)
- **Pro Plan:** $20/month + usage

### Optimization Tips

1. **Use caching** - Reduces database queries
   - ILI/ICR cached for 5-10 minutes
   - Reserve data cached for 5 minutes

2. **Optimize queries** - Use indexes
   - Check slow query logs: `/api/v1/slow-queries/stats`

3. **Right-size resources**
   - Start with 512MB memory
   - Scale up only if needed

4. **Use connection pooling**
   - Supabase: Max 10 connections
   - Redis: Max 5 connections

---

## Security

### Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use Railway's encrypted variables
   - Rotate API keys regularly

2. **Database Security**
   - Use Supabase RLS (Row Level Security)
   - Limit database user permissions
   - Enable SSL connections

3. **API Security**
   - Enable rate limiting (100 req/min)
   - Use API keys for authentication
   - Implement CORS properly

4. **Container Security**
   - Runs as non-root user (nodejs:1001)
   - Minimal Alpine base image
   - No sensitive files in image

### Security Headers

Add to Express app:
```typescript
import helmet from 'helmet';
app.use(helmet());
```

---

## Rollback

### Automatic Rollback

Railway automatically rolls back if:
- Health check fails after deployment
- Container crashes repeatedly (>3 times)

### Manual Rollback

1. Go to Deployments tab
2. Find previous successful deployment
3. Click "Redeploy"

### Emergency Rollback

```bash
# Using Railway CLI
railway rollback

# Or scale down to 0
railway down
```

---

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Railway CLI
        run: npm i -g @railway/cli
      
      - name: Deploy to Railway
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### Pre-deployment Checks

Add to workflow:
```yaml
- name: Build Test
  run: |
    cd backend
    npm ci
    npm run build
    npm test
```

---

## Performance Benchmarks

### Expected Performance

| Metric | Target | Acceptable |
|--------|--------|------------|
| Health check | <50ms | <200ms |
| ILI endpoint | <300ms | <500ms |
| ICR endpoint | <200ms | <400ms |
| Reserve state | <400ms | <800ms |
| Memory usage | <300MB | <500MB |
| CPU usage | <30% | <60% |

### Load Testing

```bash
# Install k6
brew install k6  # macOS
# or download from https://k6.io

# Run load test
k6 run load-test.js
```

Create `load-test.js`:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  let res = http.get('https://your-app.railway.app/api/v1/ili/current');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

---

## Support

### Railway Support

- Documentation: https://docs.railway.app
- Discord: https://discord.gg/railway
- Status: https://status.railway.app

### ARS Backend Issues

- GitHub Issues: https://github.com/your-org/ars-protocol/issues
- Documentation: See `backend/README.md`

---

## Checklist

### Pre-Deployment ✅

- [ ] Build succeeds locally: `npm run build`
- [ ] Tests pass: `npm test`
- [ ] Environment variables documented
- [ ] Database migrations applied
- [ ] API keys obtained (Helius, Jupiter, etc.)
- [ ] `.env.example` updated

### Deployment ✅

- [ ] Railway project created
- [ ] GitHub repository connected
- [ ] Environment variables configured
- [ ] Dockerfile path set: `backend/Dockerfile.railway`
- [ ] Health check configured: `/health`
- [ ] Domain configured (optional)

### Post-Deployment ✅

- [ ] Health check passing
- [ ] API endpoints responding
- [ ] Database connected
- [ ] Redis connected
- [ ] Logs show no errors
- [ ] Metrics endpoint accessible: `/metrics`
- [ ] Load test passed

---

## Next Steps

1. **Monitor for 24 hours** - Watch logs and metrics
2. **Set up alerts** - Configure Railway notifications
3. **Document API** - Update `ars-llms.txt` with production URL
4. **Load test** - Run k6 tests to verify performance
5. **Backup strategy** - Configure Supabase backups

---

**Deployment Status:** ✅ Ready for Production

For questions or issues, check the troubleshooting section or contact the team.
