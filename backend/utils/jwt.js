const jwt = require('jsonwebtoken');

const ALGORITHM = 'HS256';
const MIN_SECRET_LENGTH = 32;
// Must match the JWT_SECRET placeholder in backend/.env.example
const PLACEHOLDER_SECRET = 'replace-with-at-least-32-random-characters';

/**
 * Throws if JWT_SECRET is missing, too short, or still the .env.example placeholder.
 * Called once at server start so a misconfigured deployment fails immediately
 * instead of on the first login.
 */
const assertJwtConfig = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set. Add it to backend/.env (at least 32 random characters).');
  }
  if (secret === PLACEHOLDER_SECRET) {
    throw new Error('JWT_SECRET is still the placeholder from .env.example. Replace it with at least 32 random characters.');
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET is too short (${secret.length} chars); it must be at least ${MIN_SECRET_LENGTH} characters.`);
  }
};

/**
 * Signs an access token for a user.
 * @param {{_id: any, role: string, tokenVersion?: number}} user
 * @param {{expiresIn?: string|number}} [options] - override JWT_EXPIRES_IN (used by tests)
 */
const signToken = (user, options = {}) =>
  jwt.sign(
    { sub: String(user._id), role: user.role, tv: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { algorithm: ALGORITHM, expiresIn: options.expiresIn || process.env.JWT_EXPIRES_IN || '1d' }
  );

/**
 * Verifies a token (HS256 only) and returns its payload. Throws jsonwebtoken's
 * TokenExpiredError / JsonWebTokenError on failure.
 */
const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET, { algorithms: [ALGORITHM] });

const PWD_RESET_PURPOSE = 'pwd_reset';
const PWD_RESET_EXPIRES_IN = '10m';

/**
 * Signs a short-lived password reset token, issued only after a correct OTP.
 * It is single-use because resetting the password bumps tokenVersion, which invalidates `tv`.
 */
const signResetToken = (user) =>
  jwt.sign(
    { sub: String(user._id), tv: user.tokenVersion || 0, purpose: PWD_RESET_PURPOSE },
    process.env.JWT_SECRET,
    { algorithm: ALGORITHM, expiresIn: PWD_RESET_EXPIRES_IN }
  );

/**
 * Verifies a password reset token and its purpose; returns the payload.
 * Throws on bad signature/expiry, or a JsonWebTokenError if it is not a reset token.
 */
const verifyResetToken = (token) => {
  const payload = verifyToken(token);
  if (payload.purpose !== PWD_RESET_PURPOSE) {
    throw new jwt.JsonWebTokenError('Not a password reset token');
  }
  return payload;
};

module.exports = { assertJwtConfig, signToken, verifyToken, signResetToken, verifyResetToken };
