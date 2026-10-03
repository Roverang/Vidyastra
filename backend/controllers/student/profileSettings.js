const User = require('../../models/userModel');
const { HIDE_SENSITIVE_USER_FIELDS } = require('../../utils/userFields');
const { generateSalt, hashPassword, verifyPassword, validatePassword } = require('../../utils/password');
const { signToken } = require('../../utils/jwt');

// The only profile fields a user may change themselves. role, email, salt, tokenVersion,
// otp, isVerified etc. are never taken from req.body.
const EDITABLE_PROFILE_FIELDS = ['name'];

// Get student profile details
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId).select(HIDE_SENSITIVE_USER_FIELDS);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching profile', error: error.message });
  }
};

// Update student profile details and, optionally, the password.
// Body: { name?, currentPassword?, newPassword? }. A password change requires currentPassword,
// revokes all existing tokens (tokenVersion + 1) and returns a fresh token.
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { currentPassword, newPassword } = req.body;

    const $set = {};
    EDITABLE_PROFILE_FIELDS.forEach((field) => {
      const value = req.body[field];
      if (typeof value === 'string' && value.trim()) $set[field] = value.trim();
    });

    const update = { $set };
    const filter = { _id: userId };
    let newTokenVersion = null;

    if (newPassword !== undefined) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required to set a new password.' });
      }
      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        return res.status(400).json({ success: false, message: passwordError });
      }

      const user = await User.findById(userId).select('password salt tokenVersion');
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      if (!verifyPassword(currentPassword, user.salt, user.password)) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      }

      const salt = generateSalt();
      $set.password = hashPassword(newPassword, salt);
      $set.salt = salt;
      update.$inc = { tokenVersion: 1 };
      // Only apply if the password was not changed by another request since it was verified
      filter.password = user.password;
      newTokenVersion = (user.tokenVersion || 0) + 1;
    }

    if (Object.keys($set).length === 0) {
      return res.status(400).json({
        success: false,
        message: `Nothing to update. Editable fields: ${EDITABLE_PROFILE_FIELDS.join(', ')}, currentPassword + newPassword.`,
      });
    }

    const updatedUser = await User.findOneAndUpdate(
      filter,
      update,
      { new: true, runValidators: true }
    ).select(HIDE_SENSITIVE_USER_FIELDS);

    if (!updatedUser) {
      const message = newTokenVersion === null
        ? 'User not found.'
        : 'Password was changed by another request. Please try again.';
      return res.status(newTokenVersion === null ? 404 : 409).json({ success: false, message });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      data: updatedUser,
      // The old token is revoked by the tokenVersion bump, so hand back a new one
      ...(newTokenVersion !== null && {
        token: signToken({ _id: updatedUser._id, role: updatedUser.role, tokenVersion: newTokenVersion }),
      }),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating profile', error: error.message });
  }
};
