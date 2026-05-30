const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/response');

module.exports = function verifyToken(req, res, next) {
  const header = req.header('Authorization');
  if (!header) return sendError(res, 'No token provided', 401);

  const parts = header.split(' ');
  const token = parts.length === 2 ? parts[1] : parts[0];
  if (!token) return sendError(res, 'No token provided', 401);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return sendError(res, 'Invalid token', 401);
  }
};