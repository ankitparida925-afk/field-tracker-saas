import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';

// Extend Express Request to carry the decoded JWT payload
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * verifyToken
 * -----------
 * Reads a Bearer token from the Authorization header, verifies it,
 * and attaches the decoded payload to req.user.
 */
export function verifyToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized. No bearer token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Invalid or expired access token.' });
  }
}

/**
 * requireSuperAdmin
 * -----------------
 * Must be used after verifyToken.
 * Allows only superadmin-role users.
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'superadmin') {
    res.status(403).json({ error: 'Forbidden. Super Admin access required.' });
    return;
  }
  next();
}

/**
 * requireAdmin
 * ------------
 * Must be used after verifyToken.
 * Allows both admin and superadmin roles.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
    res.status(403).json({ error: 'Forbidden. Admin access required.' });
    return;
  }
  next();
}
