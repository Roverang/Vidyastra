// User fields that must never be sent to a client.
const SENSITIVE_USER_FIELDS = ['password', 'salt', 'tokenVersion', 'otp', 'otpExpires'];

// Mongoose exclusion projection for .select(...) and populate(path, ...)
const HIDE_SENSITIVE_USER_FIELDS = SENSITIVE_USER_FIELDS.map((field) => `-${field}`).join(' ');

module.exports = { SENSITIVE_USER_FIELDS, HIDE_SENSITIVE_USER_FIELDS };
