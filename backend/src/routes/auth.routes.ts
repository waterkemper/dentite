import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();
const authController = new AuthController();

/**
 * POST /api/auth/register
 * Register a new practice with admin user
 */
router.post(
  '/register',
  [
    body('practice.name').notEmpty().withMessage('Practice name is required'),
    body('practice.email').isEmail().withMessage('Valid email is required'),
    body('user.firstName').notEmpty().withMessage('First name is required'),
    body('user.lastName').notEmpty().withMessage('Last name is required'),
    body('user.email').isEmail().withMessage('Valid email is required'),
    body('user.password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ],
  validateRequest,
  authController.register
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validateRequest,
  authController.login
);

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authController.getCurrentUser);

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post(
  '/forgot-password',
  [
    body('email').isEmail().withMessage('Valid email is required'),
  ],
  validateRequest,
  authController.requestPasswordReset
);

/**
 * GET /api/auth/verify-reset-token/:token
 * Verify password reset token
 */
router.get('/verify-reset-token/:token', authController.verifyResetToken);

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ],
  validateRequest,
  authController.resetPassword
);

export default router;

