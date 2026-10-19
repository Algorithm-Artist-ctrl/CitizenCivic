import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { UserRole } from '../types';

export interface TokenUser {
  id: string;
  email: string;
  role: UserRole;
}

export function generateTokens(user: TokenUser) {
  const accessJti = crypto.randomUUID();
  const refreshJti = crypto.randomUUID();

  const access = jwt.sign(
    {
      token_type: 'access',
      user_id: user.id,
      email: user.email,
      role: user.role,
      jti: accessJti,
    },
    config.jwtSecret,
    { expiresIn: config.jwtAccessExpiry as any }
  );

  const refresh = jwt.sign(
    {
      token_type: 'refresh',
      user_id: user.id,
      jti: refreshJti,
    },
    config.jwtSecret,
    { expiresIn: config.jwtRefreshExpiry as any }
  );

  return { access, refresh };
}

export function verifyAccessToken(token: string): { user_id: string; email: string; role: UserRole } | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    if (decoded && (decoded.token_type === 'access' || !decoded.token_type)) {
      return {
        user_id: decoded.user_id,
        email: decoded.email,
        role: decoded.role,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { user_id: string } | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    if (decoded && decoded.token_type === 'refresh') {
      return { user_id: decoded.user_id };
    }
    return null;
  } catch {
    return null;
  }
}
