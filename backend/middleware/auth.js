const jwt = require('jsonwebtoken');

/**
 * Express middleware — verifies the Bearer JWT token.
 * Attaches decoded payload to req.user on success.
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied: no token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;   // { id, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Access denied: invalid or expired token' });
  }
};

module.exports = { verifyToken };
