# Security Agents Deployment Guide
## Railway/VPS Deployment with Root Access

This guide covers deploying the ARS (Agentic Reserve System) security agent swarm on Railway or VPS with root access, including HexStrike AI integration.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [System Preparation](#system-preparation)
4. [Security Agent Installation](#security-agent-installation)
5. [Configuration](#configuration)
6. [Monitoring & Alerting](#monitoring--alerting)
7. [Maintenance](#maintenance)

## Architecture Overview

### Security Agent Swarm
The ARS security architecture consists of 4 autonomous agents:

1. **Red Team Agent (HexStrike AI)**
   - Offensive security testing
   - Vulnerability discovery
   - Exploit simulation
   - Attack pattern analysis

2. **Blue Team Agent**
   - Defensive security
   - Incident response
   - Threat mitigation
   - Security patching

3. **Blockchain Security Agent**
   - Transaction monitoring
   - MEV protection
   - Smart contract security
   - On-chain anomaly detection

4. **AML/CFT Compliance Agent**
   - FATF compliance
   - OFAC sanctions screening
   - FinCEN reporting
   - KYC/AML monitoring

### Agent Communication
- **Orchestrator**: Coordinates all security agents
- **Message Queue**: Redis-based inter-agent communication
- **Consensus**: Weighted voting for critical decisions
- **Alerting**: Discord/Email notifications for incidents

## Prerequisites

### System Requirements
- **OS**: Ubuntu 22.04 LTS or Debian 12 (recommended)
- **RAM**: Minimum 8GB, recommended 16GB
- **CPU**: 4+ cores
- **Storage**: 100GB+ SSD
- **Network**: Static IP, open ports 80, 443, 8080

### Software Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Install PostgreSQL (for Supabase)
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Install Nginx
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Install Fail2Ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Install UFW Firewall
sudo apt install -y ufw
```

## System Preparation

### 1. Firewall Configuration
```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 8080/tcp  # Backend API
sudo ufw enable
```

### 2. Fail2Ban Configuration
```bash
# Create ARS-specific jail
sudo tee /etc/fail2ban/jail.d/ars.conf << EOF
[ars-api]
enabled = true
port = 8080
filter = ars-api
logpath = /var/log/ars/api.log
maxretry = 5
bantime = 3600
findtime = 600

[ars-auth]
enabled = true
port = 8080
filter = ars-auth
logpath = /var/log/ars/auth.log
maxretry = 3
bantime = 7200
findtime = 300
EOF

# Create filters
sudo tee /etc/fail2ban/filter.d/ars-api.conf << EOF
[Definition]
failregex = ^.*Failed API request from <HOST>.*$
ignoreregex =
EOF

sudo tee /etc/fail2ban/filter.d/ars-auth.conf << EOF
[Definition]
failregex = ^.*Authentication failed for <HOST>.*$
ignoreregex =
EOF

# Restart Fail2Ban
sudo systemctl restart fail2ban
```

### 3. Nginx Reverse Proxy
```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/ars << EOF
# Rate limiting
limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=auth_limit:10m rate=5r/s;

# Backend API
upstream ars_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

# Frontend
upstream ars_frontend {
    server 127.0.0.1:5173;
    keepalive 32;
}

server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # API endpoints
    location /api {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://ars_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Auth endpoints (stricter rate limiting)
    location /api/auth {
        limit_req zone=auth_limit burst=5 nodelay;
        proxy_pass http://ars_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://ars_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # Frontend
    location / {
        proxy_pass http://ars_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/ars /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Security Agent Installation

### 1. Clone ARS Repository
```bash
cd /opt
sudo git clone https://github.com/your-org/ars-protocol.git
cd ars-protocol
```

### 2. Install Dependencies
```bash
# Backend
cd backend
npm install
npm run build

# Frontend
cd ../frontend
npm install
npm run build

# Rust programs
cd ..
cargo build --release
```

### 3. Clone HexStrike AI
```bash
cd /opt
sudo git clone https://github.com/0x4m4/hexstrike-ai.git
cd hexstrike-ai
# Follow HexStrike AI installation instructions
```

### 4. Configure Environment Variables
```bash
# Create production .env
sudo tee /opt/ars-protocol/backend/.env << EOF
# Node Environment
NODE_ENV=production

# Server
PORT=3000
HOST=0.0.0.0

# Database (Supabase)
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key

# Redis
REDIS_URL=redis://localhost:6379

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WS_URL=wss://api.mainnet-beta.solana.com
HELIUS_API_KEY=your-helius-api-key

# OpenRouter AI
OPENROUTER_API_KEY=your-openrouter-api-key

# Oracle APIs
PYTH_API_KEY=your-pyth-api-key
BIRDEYE_API_KEY=your-birdeye-api-key

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# Agent Swarm
AGENT_SWARM_ENABLED=true
RED_TEAM_ENABLED=true
BLUE_TEAM_ENABLED=true
BLOCKCHAIN_SECURITY_ENABLED=true
AML_CFT_ENABLED=true

# Monitoring
DISCORD_WEBHOOK_URL=your-discord-webhook
ALERT_EMAIL=your-email@example.com
EOF

# Secure permissions
sudo chmod 600 /opt/ars-protocol/backend/.env
```

## Configuration

### 1. Systemd Services

#### Backend Service
```bash
sudo tee /etc/systemd/system/ars-backend.service << EOF
[Unit]
Description=ARS Backend API
After=network.target redis-server.service postgresql.service

[Service]
Type=simple
User=ars
WorkingDirectory=/opt/ars-protocol/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/ars/backend.log
StandardError=append:/var/log/ars/backend-error.log

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/ars-protocol/backend/logs

[Install]
WantedBy=multi-user.target
EOF
```

#### Frontend Service
```bash
sudo tee /etc/systemd/system/ars-frontend.service << EOF
[Unit]
Description=ARS Frontend
After=network.target

[Service]
Type=simple
User=ars
WorkingDirectory=/opt/ars-protocol/frontend
ExecStart=/usr/bin/npm run preview -- --host 0.0.0.0 --port 5173
Restart=always
RestartSec=10
StandardOutput=append:/var/log/ars/frontend.log
StandardError=append:/var/log/ars/frontend-error.log

[Install]
WantedBy=multi-user.target
EOF
```

#### Security Agent Orchestrator
```bash
sudo tee /etc/systemd/system/ars-security-orchestrator.service << EOF
[Unit]
Description=ARS Security Agent Orchestrator
After=network.target redis-server.service ars-backend.service

[Service]
Type=simple
User=ars
WorkingDirectory=/opt/ars-protocol/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/services/agent-swarm/orchestrator.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/ars/security-orchestrator.log
StandardError=append:/var/log/ars/security-orchestrator-error.log

[Install]
WantedBy=multi-user.target
EOF
```

#### HexStrike AI Service
```bash
sudo tee /etc/systemd/system/hexstrike-ai.service << EOF
[Unit]
Description=HexStrike AI Red Team Agent
After=network.target ars-security-orchestrator.service

[Service]
Type=simple
User=ars
WorkingDirectory=/opt/hexstrike-ai
ExecStart=/opt/hexstrike-ai/start.sh
Restart=always
RestartSec=30
StandardOutput=append:/var/log/ars/hexstrike.log
StandardError=append:/var/log/ars/hexstrike-error.log

# Security boundaries
ReadOnlyPaths=/opt/ars-protocol
ReadWritePaths=/opt/hexstrike-ai/reports

[Install]
WantedBy=multi-user.target
EOF
```

### 2. Create ARS User
```bash
# Create dedicated user
sudo useradd -r -s /bin/bash -d /opt/ars-protocol -m ars

# Set ownership
sudo chown -R ars:ars /opt/ars-protocol
sudo chown -R ars:ars /opt/hexstrike-ai

# Create log directory
sudo mkdir -p /var/log/ars
sudo chown -R ars:ars /var/log/ars
```

### 3. Enable and Start Services
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable services
sudo systemctl enable ars-backend
sudo systemctl enable ars-frontend
sudo systemctl enable ars-security-orchestrator
sudo systemctl enable hexstrike-ai

# Start services
sudo systemctl start ars-backend
sudo systemctl start ars-frontend
sudo systemctl start ars-security-orchestrator
sudo systemctl start hexstrike-ai

# Check status
sudo systemctl status ars-backend
sudo systemctl status ars-frontend
sudo systemctl status ars-security-orchestrator
sudo systemctl status hexstrike-ai
```

## Monitoring & Alerting

### 1. Log Rotation
```bash
sudo tee /etc/logrotate.d/ars << EOF
/var/log/ars/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 ars ars
    sharedscripts
    postrotate
        systemctl reload ars-backend ars-frontend ars-security-orchestrator hexstrike-ai
    endscript
}
EOF
```

### 2. Health Check Script
```bash
sudo tee /opt/ars-protocol/scripts/health-check.sh << 'EOF'
#!/bin/bash

# Check services
services=("ars-backend" "ars-frontend" "ars-security-orchestrator" "hexstrike-ai" "redis-server" "nginx")

for service in "${services[@]}"; do
    if ! systemctl is-active --quiet "$service"; then
        echo "ALERT: $service is down!"
        # Send alert (Discord/Email)
        curl -X POST "$DISCORD_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"content\": \"🚨 ALERT: $service is down on $(hostname)\"}"
    fi
done

# Check API health
if ! curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "ALERT: API health check failed!"
    curl -X POST "$DISCORD_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{\"content\": \"🚨 ALERT: API health check failed on $(hostname)\"}"
fi
EOF

sudo chmod +x /opt/ars-protocol/scripts/health-check.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/ars-protocol/scripts/health-check.sh") | crontab -
```

### 3. Security Monitoring
```bash
# Monitor failed login attempts
sudo tee /opt/ars-protocol/scripts/security-monitor.sh << 'EOF'
#!/bin/bash

# Check for suspicious activity
FAILED_LOGINS=$(grep "Failed password" /var/log/auth.log | wc -l)
if [ "$FAILED_LOGINS" -gt 10 ]; then
    echo "ALERT: High number of failed login attempts: $FAILED_LOGINS"
    curl -X POST "$DISCORD_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{\"content\": \"🚨 SECURITY ALERT: $FAILED_LOGINS failed login attempts on $(hostname)\"}"
fi

# Check HexStrike AI findings
CRITICAL_FINDINGS=$(grep "CRITICAL" /var/log/ars/hexstrike.log | tail -n 10 | wc -l)
if [ "$CRITICAL_FINDINGS" -gt 0 ]; then
    echo "ALERT: HexStrike AI found $CRITICAL_FINDINGS critical vulnerabilities"
    curl -X POST "$DISCORD_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{\"content\": \"🚨 SECURITY ALERT: HexStrike AI found $CRITICAL_FINDINGS critical vulnerabilities on $(hostname)\"}"
fi
EOF

sudo chmod +x /opt/ars-protocol/scripts/security-monitor.sh

# Add to crontab (every hour)
(crontab -l 2>/dev/null; echo "0 * * * * /opt/ars-protocol/scripts/security-monitor.sh") | crontab -
```

## Maintenance

### Daily Tasks
- Review security agent logs
- Check HexStrike AI findings
- Monitor system resources
- Verify backup completion

### Weekly Tasks
- Review Fail2Ban bans
- Analyze security trends
- Update security rules
- Test incident response

### Monthly Tasks
- Security audit
- Dependency updates
- Performance optimization
- Disaster recovery drill

### Update Procedure
```bash
# Stop services
sudo systemctl stop ars-backend ars-frontend ars-security-orchestrator hexstrike-ai

# Backup
sudo tar -czf /backup/ars-$(date +%Y%m%d).tar.gz /opt/ars-protocol

# Update code
cd /opt/ars-protocol
sudo -u ars git pull

# Update dependencies
cd backend && npm install && npm run build
cd ../frontend && npm install && npm run build
cd .. && cargo build --release

# Update HexStrike AI
cd /opt/hexstrike-ai
sudo -u ars git pull

# Restart services
sudo systemctl start ars-backend ars-frontend ars-security-orchestrator hexstrike-ai

# Verify
sudo systemctl status ars-backend ars-frontend ars-security-orchestrator hexstrike-ai
```

## Troubleshooting

### Service Won't Start
```bash
# Check logs
sudo journalctl -u ars-backend -n 50
sudo journalctl -u ars-security-orchestrator -n 50

# Check permissions
ls -la /opt/ars-protocol/backend
ls -la /var/log/ars

# Check ports
sudo netstat -tulpn | grep -E '(3000|5173|6379)'
```

### High CPU/Memory Usage
```bash
# Check resource usage
htop
sudo systemctl status ars-*

# Check agent activity
tail -f /var/log/ars/security-orchestrator.log
tail -f /var/log/ars/hexstrike.log
```

### Security Agent Not Responding
```bash
# Check Redis
redis-cli ping

# Check agent communication
redis-cli KEYS "acb:*"

# Restart orchestrator
sudo systemctl restart ars-security-orchestrator
```

## Security Best Practices

1. **Principle of Least Privilege**: Run services as dedicated user
2. **Defense in Depth**: Multiple security layers (firewall, Fail2Ban, rate limiting)
3. **Monitoring**: Continuous monitoring and alerting
4. **Incident Response**: Documented procedures for security incidents
5. **Regular Updates**: Keep all software up to date
6. **Backup**: Regular backups with tested recovery procedures
7. **Audit Logging**: Comprehensive logging of all security events
8. **Access Control**: Strict SSH key-based authentication only

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-05  
**Maintainer**: ARS Security Team
