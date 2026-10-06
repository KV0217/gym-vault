import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'gym_vault_jwt_secret_key_2026';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Optional auth helper: if token present, sets req.user; otherwise defaults to demo user ID 1
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (err) {
      // Token invalid or expired
    }
  }

  // Fallback to user ID 1 for backward compatibility
  req.user = { id: 1, email: 'athlete@gym.app', name: 'Athlete', role: 'athlete' };
  next();
}
