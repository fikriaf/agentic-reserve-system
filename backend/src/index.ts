import http from 'http';
import { createApp } from './app';
import { WebSocketService } from './services/websocket';
import { PolicyExecutor } from './services/policy-executor';
import { initializeCronJobs, runInitialUpdates } from './cron';
import { config } from './config';
import { sakService } from './services/sak';

async function startServer() {
  try {
    const app = createApp();
    const server = http.createServer(app);

    // Start server first so health check can respond
    server.listen(config.port, () => {
      console.log(`🚀 ARS Backend API running on port ${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`✅ Health check available at /health`);
    });

    // Initialize services asynchronously (don't block server start)
    initializeServices(server).catch(err => {
      console.error('⚠️  Service initialization failed (non-fatal):', err.message);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('Shutdown signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function initializeServices(server: http.Server) {
  try {
    // Initialize SAK service
    if (config.sak.enabled) {
      console.log('🔧 Initializing Solana Agent Kit (SAK) integration...');
      try {
        await sakService.initialize();
        console.log('✅ SAK integration initialized successfully');
      } catch (err: any) {
        console.error('⚠️  SAK initialization failed:', err.message);
      }
    } else {
      console.log('⚠️  SAK integration is disabled');
    }

    // Initialize WebSocket service with the actual HTTP server
    try {
      const wsService = new WebSocketService(server);
      console.log('✅ WebSocket service initialized');
    } catch (err: any) {
      console.error('⚠️  WebSocket initialization failed:', err.message);
    }

    // Initialize Policy Executor
    try {
      const policyExecutor = new PolicyExecutor();
      policyExecutor.start();
      console.log('✅ Policy executor started');
    } catch (err: any) {
      console.error('⚠️  Policy executor failed:', err.message);
    }

    // Run initial ILI and ICR calculations
    try {
      await runInitialUpdates();
      console.log('✅ Initial data updates completed');
    } catch (err: any) {
      console.error('⚠️  Initial updates failed:', err.message);
    }

    // Initialize cron jobs for scheduled updates
    try {
      initializeCronJobs();
      console.log('✅ Cron jobs initialized');
    } catch (err: any) {
      console.error('⚠️  Cron jobs failed:', err.message);
    }

    console.log('🎉 All services initialized');
  } catch (error: any) {
    console.error('Service initialization error:', error.message);
  }
}

startServer();
