import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import config from './config';
import screenshotRoutes from './routes/screenshot';

const app: Express = express();

// Middleware security
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to allow screenshots
}));

// Middleware for CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));

// Middleware for rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests. Try again later.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Middleware for parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware for logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Global health check route
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.server.nodeEnv
  });
});

// Root route
app.get('/', (_, res) => {
  res.json({
    success: true,
    message: 'Screenshot API - Scraping and Image Capture',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      screenshot: '/api/screenshot',
      screenshotHealth: '/api/screenshot/health'
    },
  });
});

// API routes
app.use('/api/screenshot', screenshotRoutes);

// Middleware for handling 404 errors
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Middleware global for handling errors
app.use((error: Error, __: Request, res: Response, _: NextFunction) => {
  console.error('Unhandled error:', error);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: config.server.nodeEnv === 'development' ? error.message : 'Algo deu errado',
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = config.server.port;

app.listen(PORT, () => {
  console.log('🚀 Server started successfully!');
  console.log(`📋 Health Check: /health`);
  console.log(`📸 Screenshot API: /api/screenshot`);
});

// Handling of signals for graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down server...');
  process.exit(0);
});

export default app;
