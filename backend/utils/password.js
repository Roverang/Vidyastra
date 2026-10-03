const crypto = require('crypto');

const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_TOO_SHORT_MESSAGE = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;

const generateSalt = () => crypto.randomBytes(16).toString('hex');
const hashPassword = (password, salt) => crypto.scryptSync(password, salt, 64).toString('hex');

// Constant-time comparison of a password against the stored hex scrypt hash
const verifyPassword = (password, salt, storedHash) => {
  if (typeof password !== 'string' || typeof storedHash !== 'string' || !salt) return false;
  const candidate = Buffer.from(hashPassword(password, salt), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
};

// Returns an error message if the password breaks the policy, otherwise null
const validatePassword = (password) => {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return PASSWORD_TOO_SHORT_MESSAGE;
  }
  return null;
};

module.exports = {
  MIN_PASSWORD_LENGTH,
  PASSWORD_TOO_SHORT_MESSAGE,
  generateSalt,
  hashPassword,
  verifyPassword,
  validatePassword,
};
