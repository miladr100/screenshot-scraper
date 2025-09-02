import dotenv from 'dotenv';

dotenv.config();

interface Config {
  server: {
    port: number;
    nodeEnv: string;
  };
  aws: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    s3BucketName: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  screenshot: {
    maxDuration: number;
    numberOfRetries: number;
    delayBetweenRetries: number;
    takeScreenshotTimeout: number;
    loadStrategies: string[];
    timeouts: number[];
    enhancedTimeouts: number[];
  };
  cache: {
    defaultExpirationDays: number;
    cacheableDomains: string[];
  };
}

const config: Config = {
  server: {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    s3BucketName: process.env.S3_BUCKET_NAME || '',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },
  screenshot: {
    maxDuration: 300, // 5 minutos
    numberOfRetries: 4,
    delayBetweenRetries: 1500,
    takeScreenshotTimeout: 50000,
    loadStrategies: ['load', 'networkidle', 'domcontentloaded'],
    timeouts: [60000, 120000],
    enhancedTimeouts: [90000, 150000, 180000],
  },
  cache: {
    defaultExpirationDays: 7,
    cacheableDomains: [
      'braip.com',
      'ev.braip.com',
      'hotmart.com',
      'monetizze.com.br',
      'kiwify.com',
    ],
  },
};

// Validação das configurações obrigatórias
const requiredEnvVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'S3_BUCKET_NAME',
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Variáveis de ambiente obrigatórias não encontradas:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\n📝 Copie o arquivo env.example para .env e configure as variáveis necessárias.');
  process.exit(1);
}

export default config;
