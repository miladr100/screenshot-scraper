import { Request, Response, NextFunction } from 'express';

/**
 * Simple authentication middleware
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // Para este exemplo, vamos usar um header simples
  // Em produção, implemente autenticação adequada
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API Key is required',
      message: 'Include the x-api-key header in the request'
    });
  }

  // Validação simples da API key
  // Em produção, valide contra um banco de dados ou serviço de autenticação
  if (apiKey !== process.env.API_KEY && apiKey !== 'demo-key') {
    return res.status(401).json({
      success: false,
      error: 'API Key invalid'
    });
  }

  // Adicionar informações do usuário ao request
  (req as any).user = {
    id: `user_${String(apiKey).slice(-8)}`, // ID baseado na API key
    apiKey: apiKey
  };

  next();
};
