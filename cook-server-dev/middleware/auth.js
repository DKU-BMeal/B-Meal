import { verifyToken } from '../utils/jwt.js';

// Authentication middleware
export function authenticateToken(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'No token provided' 
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Attach user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name
    };

    next();
  } catch (error) {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Invalid or expired token' 
    });
  }
}

// Optional authentication (doesn't fail if no token)
export function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name
      };
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}
