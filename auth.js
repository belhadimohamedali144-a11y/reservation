const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'arts-house-maadid-secret-change-in-production-2026';

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

function checkPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function generateToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '24h' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Token manquant.' });
  }
  const decoded = verifyToken(header.split(' ')[1]);
  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Token invalide ou expiré.' });
  }
  req.admin = decoded;
  next();
}

module.exports = { hashPassword, checkPassword, generateToken, verifyToken, authMiddleware, SECRET };
