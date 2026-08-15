import { Request, Response, NextFunction } from 'express';
import { ProcessedMutation } from '../models/ProcessedMutation';

export const checkIdempotency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const key = req.headers['idempotency-key'];
  if (!key || typeof key !== 'string') {
    return next();
  }

  try {
    const existing = await ProcessedMutation.findOne({ key });
    if (existing) {
      console.log(`[Idempotency] Replaying cached response for key: ${key}`);
      res.status(existing.statusCode).json(existing.responseBody);
      return;
    }

    // Intercept and cache the JSON response sent by the route handler
    const originalJson = res.json;
    res.json = function (body: any): any {
      // Restore original function
      res.json = originalJson;

      // Only cache successful or client-retryable validation responses (skip server 5xx errors to allow retry)
      if (res.statusCode < 500) {
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 Hours TTL
        ProcessedMutation.create({
          key,
          statusCode: res.statusCode,
          responseBody: body,
          expiresAt
        }).catch(err => console.error('[Idempotency] Failed to store cached response:', err));
      }

      return originalJson.call(this, body);
    };

    next();
  } catch (err) {
    console.error('[Idempotency] Middleware error:', err);
    next();
  }
};
