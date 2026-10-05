const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function authenticate(req, res, next) {
  const authorization = req.headers.authorization;
  const parts = authorization ? authorization.trim().split(/\s+/) : [];
  const [scheme, token] = parts;

  if (parts.length !== 2 || !scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    return res.status(401).json({ message: 'A valid Bearer token is required.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }

  try {
    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({ message: 'The account for this token no longer exists.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = authenticate;
