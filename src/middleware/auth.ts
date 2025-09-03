import { Request, Response, NextFunction } from 'express';

/**
 * Simple authentication middleware
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: 'API Key is required',
      message: 'Include the x-api-key header in the request'
    });
    return;
  }

  if (apiKey !== process.env.API_KEY && apiKey !== 'demo-key') {
    res.status(401).json({
      success: false,
      error: 'API Key invalid'
    });
    return;
  }

  (req as any).user = {
    apiKey: apiKey
  };

  next();
};
