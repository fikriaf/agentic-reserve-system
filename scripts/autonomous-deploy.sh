#!/bin/bash
# autonomous-deploy.sh - Fully autonomous VPS deployment for Agentic Capital Bank

set -e

echo "🚀 Starting autonomous ARS deployment..."

# 1. System setup
echo "📦 Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y \
  nodejs \
  npm \
  redis-server \
  postgresql \
  git \
  build-essential \
  curl \
  nginx

# 2. Install PM2
echo "📦 Installing PM2..."
sudo npm install -g pm2 ts-node typescript

# 3. Setup PostgreSQL
echo "🗄️ Configuring PostgreSQL..."
sudo -u postgres psql -c "CREATE DATABASE icb;" || true
sudo -u postgres psql -c "CREATE USER icb_user WITH PASSWORD 'secure_password_$(openssl rand -hex 16)';" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE icb TO icb_user;" || true

# 4. Clone repository
echo "📥 Cloning repository..."
cd /opt
if [ -d "internet-capital-bank" ]; then
  cd internet-capital-bank
  git pull origin main
else
  sudo git clone https://github.com/protocoldaemon-sec/internet-capital-bank.git
  cd internet-capital-bank
fi
sudo chown -R $USER:$USER .

# 5. Install dependencies
echo "📦 Installing dependencies..."
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 6. Generate environment configuration
echo "⚙️ Generating configuration..."
cat > .env << EOF
# Database
DATABASE_URL=postgresql://icb_user:secure_password@localhost:5432/icb

# Redis
REDIS_URL=redis://localhost:6379

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet

# OpenRouter AI
OPENROUTER_API_KEY=\${OPENROUTER_API_KEY}
OPENROUTER_REFERER=https://internet-capital-bank.com

# Services
HELIUS_API_KEY=\${HELIUS_API_KEY}
BIRDEYE_API_KEY=\${BIRDEYE_API_KEY}

# Agent Swarm
AGENT_MODE=autonomous
ENABLE_SELF_MANAGEMENT=true
ENABLE_AUTO_UPGRADE=true
ENABLE_SKILL_LEARNING=true

# MagicBlock
MAGIC_ROUTER_URL=https://devnet.magicblock.app

# Kamino
KAMINO_API_URL=https://api.kamino.finance

# Meteora
METEORA_API_URL=https://app.meteora.ag

# Jupiter
JUPITER_API_URL=https://quote-api.jup.ag/v6
EOF

cp .env backend/.env

# 7. Build frontend
echo "🏗️ Building frontend..."
cd frontend
npm run build
cd ..

# 8. Setup PM2 ecosystem
echo "⚙️ Configuring PM2..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'ars-orchestrator',
      script: 'backend/src/services/agent-swarm/orchestrator.ts',
      interpreter: 'ts-node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'ars-backend',
      script: 'backend/src/index.ts',
      interpreter: 'ts-node',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'ars-policy-agent',
      script: 'backend/src/services/agent-swarm/agents/policy-agent.ts',
      interpreter: 'ts-node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
EOF

# 9. Start services
echo "🚀 Starting services..."
pm2 start ecosystem.config.js
pm2 startup systemd -u $USER --hp $HOME
pm2 save

# 10. Configure firewall
echo "🔒 Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw --force enable

# 11. Setup nginx
echo "🌐 Setting up nginx..."
sudo cat > /etc/nginx/sites-available/icb << 'EOF'
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        root /opt/internet-capital-bank/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/icb /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# 12. Setup auto-upgrade cron job
echo "⏰ Setting up auto-upgrade..."
(crontab -l 2>/dev/null; echo "0 */6 * * * cd /opt/internet-capital-bank && git pull origin main && npm install && pm2 reload all") | crontab -

# 13. Setup monitoring
echo "📊 Setting up monitoring..."
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Access your ARS instance at: http://$(curl -s ifconfig.me)"
echo "📊 Monitor with: pm2 monit"
echo "📝 View logs with: pm2 logs"
echo "🔄 Restart all: pm2 restart all"
echo "💾 Save config: pm2 save"
echo ""
echo "🤖 Agents are now running autonomously!"
echo "   - Orchestrator: Managing all agents"
echo "   - Policy Agent: Analyzing monetary policy"
echo "   - Backend API: Serving requests"
echo ""
echo "⚙️ Next steps:"
echo "   1. Set environment variables in .env"
echo "   2. Configure Solana wallet keys"
echo "   3. Add API keys for external services"
echo "   4. Monitor agent health: pm2 monit"
echo ""
