import express from 'express';
import { captureAndUpload } from '../services/screenshotService';
import { checkBucketAccess } from '../utils/s3';
import config from '../config';

const router = express.Router();

/**
 * POST /screenshot
 * Capture screenshots of a URL 
 */
router.post('/', async (req, res) => {
  try {
    const { url, productId, userId, type = 'both' } = req.body;

    console.log(`Starting screenshot capture for: ${url}`);
    console.log(`Type: ${type}`);

    if (!userId || !url) {
      return res.status(400).json({
        success: false,
        error: 'User ID and URL are required'
      });
    }

    // Check if S3 bucket is configured
    if (!config.aws.s3BucketName) {
      return res.status(500).json({
        success: false,
        error: 'S3 configuration not found'
      });
    }

    const results: { desktop?: string; mobile?: string } = {};

    // Capture screenshots based on the requested type
    if (type === 'desktop' || type === 'both') {
      console.log('Taking desktop screenshot...');
      results.desktop = await captureAndUpload(url, 'desktop', userId, productId as string);
      console.log('Screenshot desktop completed');
    }

    if (type === 'mobile' || type === 'both') {
      console.log('Taking mobile screenshot...');
      results.mobile = await captureAndUpload(url, 'mobile', userId, productId as string);
      console.log('Screenshot mobile completed');
    }

    console.log('Screenshot capture completed successfully');

    res.json({
      success: true,
      screenshots: results,
      metadata: {
        url,
        productId,
        capturedAt: new Date().toISOString(),
        type
      }
    });

  } catch (error) {
    console.error('Error capturing screenshots:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to capture screenshots',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /screenshot/health
 * Check if the service is working
 */
router.get('/health', async (_, res) => {
  try {
    // Check essential configurations
    const checks: { s3: boolean; aws: boolean; playwright: boolean; s3Access?: boolean; s3Error?: string } = {
      s3: !!config.aws.s3BucketName,
      aws: !!(config.aws.accessKeyId && config.aws.secretAccessKey),
      playwright: true, // Assuming it's installed
    };

    // Check if the S3 bucket is configured
    if (config.aws.s3BucketName) {
      try {
        checks.s3Access = await checkBucketAccess(config.aws.s3BucketName);
      } catch (error) {
        checks.s3Access = false;
        checks.s3Error = error.message;
      }
    }

    const allHealthy = Object.values(checks).every(check =>
      typeof check === 'boolean' ? check : true
    );

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
